import assert from "node:assert/strict";
import { inspect } from "node:util";
import "./server-resolver.mjs";
import { forbidNetwork } from "./offline.mjs";
import { foreignOrigin, origin, secret } from "./fixtures.mjs";

const network = forbidNetwork();
const [mode, key, value] = process.argv.slice(2);

try {
  // Import real production assembly; no Prisma or Better Auth dependency is
  // mocked. Prisma construction is lazy and this probe performs no DB queries.
  const { getAuth } = await import("../../../src/lib/auth/server.ts");
  const { getRuntimeEnvironment } =
    await import("../../../src/lib/env.server.ts");
  assert.equal(network.attempts, 0);

  if (mode === "valid") {
    const auth = getAuth();
    const context = await auth.$context;
    // Boolean assertions intentionally avoid printing secret values on failure.
    assert.ok(context.secret === secret, "Effective singular secret changed.");
    assert.ok(context.options.secret === secret, "Configured secret changed.");
    assert.ok(context.secretConfig === secret, "Rotation keys were activated.");
    assert.deepEqual([...new Set(context.trustedOrigins)], [origin]);
    assert.deepEqual(context.options.trustedOrigins, [origin]);
    assert.equal(context.isTrustedOrigin(origin), true);
    assert.equal(context.isTrustedOrigin(foreignOrigin), false);
    assert.equal(context.skipCSRFCheck, false);
    assert.equal(context.skipOriginCheck, false);
    assert.equal(context.options.telemetry.enabled, false);
    assert.equal(getAuth(), auth);
    assert.equal(network.attempts, 0);
    process.stdout.write(JSON.stringify({ outcome: "approved", network: 0 }));
  } else {
    if (mode === "cached-environment" || mode === "cached-auth") {
      // Simulate a previously cached validated environment. Production must
      // recheck unsupported inputs before reusing that cache for auth startup.
      getRuntimeEnvironment();
      if (mode === "cached-auth") await getAuth().$context;
      process.env[key] = value;
    }
    const before = process.env[key];
    let error;
    try {
      if (mode === "schema") {
        await import("../../../scripts/generate-auth-schema.mjs");
      } else {
        await getAuth().$context;
      }
    } catch (caught) {
      error = caught;
    }
    assert.ok(
      error instanceof Error,
      "Unsupported input reached auth startup.",
    );
    assert.ok(
      error.message.includes(key),
      "Rejected variable name is missing.",
    );
    assert.ok(error.message.includes("Values are hidden."));
    assert.deepEqual(Object.getOwnPropertyNames(error).sort(), [
      "message",
      "stack",
    ]);
    assert.equal(
      process.env[key],
      before,
      "Application mutated rejected input.",
    );
    assert.equal(network.attempts, 0);
    // Parent checks this entire captured output, including stack/properties and
    // dependency logs, against fixture values before displaying any diagnostics.
    process.stdout.write(
      JSON.stringify({
        outcome: "rejected",
        error: inspect(error),
        network: 0,
      }),
    );
  }
} catch {
  // Never let Node's default exception printer expose a fixture or auth config.
  process.stderr.write("Isolated authentication regression probe failed.\n");
  process.exitCode = 1;
} finally {
  network.restore();
}
