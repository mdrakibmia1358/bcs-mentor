import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Server } from "node:net";
import http from "node:http";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";
import test from "node:test";

import { authorizeIntegrationChild } from "./launch.mjs";
import { requireLocalContext } from "./bootstrap.mjs";

// Only built-ins are loaded until isolation, launch authority, and source hashes
// are checked. A fabricated environment marker cannot activate the live suite.
let enabled = false;
try {
  enabled = await authorizeIntegrationChild();
  if (enabled) requireLocalContext();
} catch {
  process.stderr.write("Integration launch refused. Values are hidden.\n");
  process.exitCode = 1;
}

if (!enabled) {
  test(
    "PostgreSQL integration is disabled",
    {
      skip: "Use the explicitly opted-in integration runner after independent review.",
    },
    () => {},
  );
} else {
  test("approved PostgreSQL integration", async (context) => {
    let prisma;
    let interrupted = false;
    let cleanupFailed = false;
    let caseFailed = false;
    const interrupt = () => {
      interrupted = true;
    };
    process.on("SIGINT", interrupt);
    process.on("SIGTERM", interrupt);

    // The only HTTP client retained is used for fixed, read-only Neon API calls.
    // Production auth/email modules are never imported or initialized.
    const fetcher = globalThis.fetch;
    const original = {
      listen: Server.prototype.listen,
      httpRequest: http.request,
      httpGet: http.get,
      httpsRequest: https.request,
      httpsGet: https.get,
    };
    const blocked = () => {
      throw new Error("HTTP and listeners are forbidden in database tests.");
    };
    globalThis.fetch = blocked;
    Server.prototype.listen = blocked;
    http.request = http.get = https.request = https.get = blocked;
    syncBuiltinESMExports();

    const owned = { user: new Set(), session: new Set(), account: new Set() };
    const runId = process.env.BCS_INTEGRATION_CHILD;
    const identifier = () => `bcs-integration-${runId}-${randomUUID()}`;
    let transaction;

    async function removeUser(tx, id) {
      assert.ok(owned.user.has(id), "Deletion requires current-run ownership.");
      // The parent row lock blocks concurrent FK inserts while checking children
      // and deleting, so a cascade cannot race an unexpected new relation.
      const parents = await tx.$queryRaw`
        SELECT id FROM public."user" WHERE id = ${id} FOR UPDATE`;
      if (parents.length === 0) return;
      // Do not let a cascade remove an unexpected, externally-created child.
      for (const model of ["session", "account"]) {
        const rows = await tx[model].findMany({
          where: { userId: id },
          select: { id: true },
        });
        assert.ok(
          rows.every((row) => owned[model].has(row.id)),
          "Unexpected related record; deletion refused.",
        );
      }
      await tx.user.delete({ where: { id }, select: { id: true } });
    }

    async function cleanup() {
      if (!Object.values(owned).some((ids) => ids.size)) return;
      // Identity checks also apply to cleanup. Never delete on an uncertain or
      // newly promoted default branch, even if that means leaving test residue.
      await transaction(async (tx) => {
        for (const model of ["session", "account"]) {
          for (const id of owned[model]) {
            if (
              await tx[model].findUnique({
                where: { id },
                select: { id: true },
              })
            ) {
              await tx[model].delete({ where: { id }, select: { id: true } });
            }
          }
        }
        for (const id of owned.user) await removeUser(tx, id);
        for (const model of ["user", "session", "account"]) {
          for (const id of owned[model]) {
            assert.ok(
              (await tx[model].findUnique({
                where: { id },
                select: { id: true },
              })) === null,
              "Current-run cleanup is incomplete.",
            );
          }
        }
      }, true);
    }

    async function createUser(tx, overrides = {}) {
      const data = {
        id: identifier(),
        name: identifier(),
        email: `${randomUUID()}@integration.test`,
        ...overrides,
      };
      const row = await tx.user.create({ data });
      // Record successful creates before transaction commit; an ambiguous commit
      // can still be cleaned by exact ID. Failed/colliding inserts are not owned.
      owned.user.add(row.id);
      return row;
    }

    async function createSession(tx, userId, overrides = {}) {
      const row = await tx.session.create({
        data: {
          id: identifier(),
          userId,
          token: identifier(),
          expiresAt: new Date(Date.now() + 60_000),
          ...overrides,
        },
      });
      owned.session.add(row.id);
      return row;
    }

    async function createAccount(tx, userId) {
      const row = await tx.account.create({
        data: {
          id: identifier(),
          userId,
          accountId: identifier(),
          providerId: "integration-synthetic",
        },
      });
      owned.account.add(row.id);
      return row;
    }

    async function expectCode(operation, code) {
      let matched = false;
      try {
        await operation();
      } catch (error) {
        matched = error?.code === code;
      }
      assert.ok(matched, "Expected database constraint was not enforced.");
    }

    async function check(name, operation) {
      assert.ok(
        !interrupted && !caseFailed,
        "Run interrupted or a previous check failed.",
      );
      await context.test(name, async () => {
        try {
          await operation();
        } catch {
          caseFailed = true;
          throw new Error(
            "Database integration check failed. Diagnostics withheld.",
          );
        }
      });
      assert.ok(!caseFailed, "Stopping after a failed integration check.");
    }

    try {
      const {
        loadLocalConfiguration,
        requireSafe,
        requireLocalContext,
        verifyNeonIdentity,
        verifyDatabaseIdentity,
      } = await import("./guards.mjs");
      const config = loadLocalConfiguration();
      await verifyNeonIdentity(config, fetcher);
      Object.assign(process.env, config.runtime);
      // Reuse the genuine production client, adapter, TLS/channel binding and
      // pool limits, with the existing test-only TS/@ alias resolver.
      await import("../security/helpers/server-resolver.mjs");
      const { getPrisma } = await import("../../src/lib/db.server.ts");
      prisma = getPrisma();

      transaction = async (operation, cleaning = false) => {
        requireSafe(cleaning || !interrupted, "Integration run interrupted.");
        requireLocalContext();
        await verifyNeonIdentity(config, fetcher);
        return prisma.$transaction(
          async (tx) => {
            // SET LOCAL affects this transaction only; no schema/data mutation.
            await tx.$executeRaw`SET LOCAL statement_timeout = '10s'`;
            await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;
            await verifyDatabaseIdentity(tx, config);
            requireSafe(
              cleaning || !interrupted,
              "Integration run interrupted.",
            );
            return operation(tx);
          },
          { maxWait: 10_000, timeout: 30_000 },
        );
      };

      await check("pooled Prisma connection and simple queries", async () => {
        await transaction(async (tx) => {
          const rows = await tx.$queryRaw`SELECT 1::integer AS value`;
          assert.ok(
            rows.length === 1 && rows[0].value === 1,
            "Simple pooled query failed.",
          );
        });
      });

      await check("synthetic User CRUD", async () => {
        const user = await transaction((tx) => createUser(tx));
        await transaction(async (tx) => {
          const found = await tx.user.findUnique({ where: { id: user.id } });
          assert.ok(found?.email === user.email, "Synthetic user read failed.");
          const name = identifier();
          const updated = await tx.user.update({
            where: { id: user.id },
            data: { name },
          });
          assert.ok(
            updated.name === name && updated.email === user.email,
            "Synthetic user update failed.",
          );
        });
        await transaction((tx) => removeUser(tx, user.id));
        await transaction(async (tx) => {
          assert.ok(
            (await tx.user.findUnique({ where: { id: user.id } })) === null,
            "Synthetic user delete failed.",
          );
        });
      });

      await check("duplicate email unique constraint", async () => {
        const user = await transaction((tx) => createUser(tx));
        await expectCode(
          () => transaction((tx) => createUser(tx, { email: user.email })),
          "P2002",
        );
      });

      await check("duplicate session token unique constraint", async () => {
        const [user, other] = await transaction(async (tx) => [
          await createUser(tx),
          await createUser(tx),
        ]);
        const session = await transaction((tx) => createSession(tx, user.id));
        await expectCode(
          () =>
            transaction((tx) =>
              createSession(tx, other.id, { token: session.token }),
            ),
          "P2002",
        );
      });

      await check("Session foreign key enforcement", async () => {
        await expectCode(
          () => transaction((tx) => createSession(tx, identifier())),
          "P2003",
        );
      });

      await check("Account foreign key enforcement", async () => {
        await expectCode(
          () => transaction((tx) => createAccount(tx, identifier())),
          "P2003",
        );
      });

      await check("cascading deletion of related records", async () => {
        const records = await transaction(async (tx) => {
          const user = await createUser(tx);
          return {
            user,
            session: await createSession(tx, user.id),
            account: await createAccount(tx, user.id),
          };
        });
        await transaction((tx) => removeUser(tx, records.user.id));
        await transaction(async (tx) => {
          for (const model of ["user", "session", "account"]) {
            assert.ok(
              (await tx[model].findUnique({
                where: { id: records[model].id },
              })) === null,
              "Cascade left a related synthetic record.",
            );
          }
        });
      });

      await check("transaction rollback", async () => {
        const rollback = new Error("Synthetic rollback sentinel.");
        const records = {};
        let rolledBack = false;
        try {
          await transaction(async (tx) => {
            records.user = await createUser(tx);
            records.session = await createSession(tx, records.user.id);
            records.account = await createAccount(tx, records.user.id);
            throw rollback;
          });
        } catch (error) {
          rolledBack = error === rollback;
        }
        assert.ok(rolledBack, "Expected rollback did not occur.");
        await transaction(async (tx) => {
          for (const model of ["user", "session", "account"]) {
            assert.ok(
              (await tx[model].findUnique({
                where: { id: records[model].id },
              })) === null,
              "Rollback left a synthetic record.",
            );
          }
        });
      });

      await check("cleanup of current-run records", cleanup);
    } catch {
      throw new Error(
        "Integration preflight or test failed. Values and driver diagnostics are hidden.",
      );
    } finally {
      try {
        if (prisma && transaction) await cleanup();
      } catch {
        cleanupFailed = true;
      } finally {
        try {
          if (prisma) await prisma.$disconnect();
        } catch {
          cleanupFailed = true;
        }
        process.removeListener("SIGINT", interrupt);
        process.removeListener("SIGTERM", interrupt);
        globalThis.fetch = fetcher;
        Server.prototype.listen = original.listen;
        http.request = original.httpRequest;
        http.get = original.httpGet;
        https.request = original.httpsRequest;
        https.get = original.httpsGet;
        syncBuiltinESMExports();
      }
      if (cleanupFailed)
        throw new Error(
          "Cleanup or disconnect failed. Independent review is required; no broad cleanup is allowed.",
        );
    }
  });
}
