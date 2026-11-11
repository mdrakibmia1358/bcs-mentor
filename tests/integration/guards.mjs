import { parse } from "dotenv";
import {
  readMigrationEnvironment,
  readRuntimeEnvironment,
} from "../../src/lib/env.ts";
import {
  requireSafe,
  requireOptIn,
  requireLocalContext,
  readPrivateEnvironment,
  migrationName,
  migrationHash,
} from "./bootstrap.mjs";
export {
  requireSafe,
  requireOptIn,
  requireLocalContext,
  migrationName,
  migrationHash,
} from "./bootstrap.mjs";

export const projectId = "old-hill-91650824";
export const branchId = "br-soft-snow-aokt2rxj";
export const pooledHost =
  "ep-patient-band-aoj9br9e-pooler.c-2.ap-southeast-1.aws.neon.tech";
export const directHost =
  "ep-patient-band-aoj9br9e.c-2.ap-southeast-1.aws.neon.tech";
export const endpointId = "ep-patient-band-aoj9br9e";
export function validateConfiguration(source) {
  try {
    // The test process must never use a production runtime mode.
    requireSafe(source.NODE_ENV === undefined || source.NODE_ENV === "test");
    const runtime = readRuntimeEnvironment({ ...source, NODE_ENV: "test" });
    const migration = readMigrationEnvironment(source);
    const urls = [new URL(source.DATABASE_URL), new URL(source.DIRECT_URL)];
    for (const [index, url] of urls.entries()) {
      requireSafe(["postgres:", "postgresql:"].includes(url.protocol));
      requireSafe(url.hostname === [pooledHost, directHost][index]);
      requireSafe(url.pathname === "/neondb" && !url.hash);
      requireSafe(url.port === "" || url.port === "5432");
      requireSafe(Boolean(url.username && url.password));
      requireSafe([...url.searchParams].length === 2);
      requireSafe(url.searchParams.get("sslmode") === "verify-full");
      requireSafe(url.searchParams.get("channel_binding") === "require");
    }
    const role = decodeURIComponent(urls[0].username);
    requireSafe(role === decodeURIComponent(urls[1].username));
    requireSafe(
      decodeURIComponent(urls[0].password) ===
        decodeURIComponent(urls[1].password),
    );
    requireSafe(source.NEON_PROJECT_ID === projectId);
    requireSafe(source.NEON_INTEGRATION_BRANCH_ID === branchId);
    requireSafe(
      typeof source.NEON_API_KEY === "string" &&
        source.NEON_API_KEY.trim().length > 0,
    );
    requireSafe(!/[\r\n]/.test(source.NEON_API_KEY));
    return {
      runtime,
      directURL: migration.DIRECT_URL,
      role,
      projectId: source.NEON_PROJECT_ID,
      branchId: source.NEON_INTEGRATION_BRANCH_ID,
      apiKey: source.NEON_API_KEY,
    };
  } catch {
    throw new Error(
      "Integration configuration is missing or unsafe. Values are hidden.",
    );
  }
}

export function loadLocalConfiguration(environment = process.env) {
  requireOptIn(environment);
  requireLocalContext();
  try {
    // parse does not populate process.env, expand shell variables, or load .env.local.
    return validateConfiguration(parse(readPrivateEnvironment()));
  } catch {
    throw new Error(
      "Ignored local .env could not supply approved integration configuration. Values are hidden.",
    );
  }
}

export function validateNeonIdentity(config, endpoint, branch) {
  requireSafe(
    config.projectId === projectId &&
      config.branchId === branchId &&
      endpoint?.id === endpointId &&
      endpoint.project_id === config.projectId &&
      endpoint.branch_id === config.branchId &&
      endpoint.host === directHost &&
      endpoint.type === "read_write" &&
      branch?.id === config.branchId &&
      branch.project_id === config.projectId &&
      branch.default === false &&
      branch.protected === false &&
      branch.current_state === "ready",
    "Neon endpoint is not a verified, ready, non-default integration branch.",
  );
}

export async function verifyNeonIdentity(config, fetcher = globalThis.fetch) {
  try {
    // Fixed origin and GET-only paths. No redirects, mutations, or arbitrary URLs.
    const base = `https://console.neon.tech/api/v2/projects/${config.projectId}`;
    async function get(path) {
      const response = await fetcher(base + path, {
        method: "GET",
        redirect: "error",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      });
      requireSafe(response.ok);
      return response.json();
    }
    const { endpoint } = await get(`/endpoints/${endpointId}`);
    const { branch } = await get(`/branches/${config.branchId}`);
    validateNeonIdentity(config, endpoint, branch);
  } catch {
    throw new Error(
      "Read-only Neon branch verification failed. No write is authorized.",
    );
  }
}

export function validateDatabaseIdentity(config, identity, migrations) {
  requireSafe(
    identity?.database === "neondb" &&
      identity.role === config.role &&
      identity.schema === "public" &&
      identity.replica === false,
    "Connected PostgreSQL identity could not be verified.",
  );
  // Unexpected, pending, failed, rolled-back, or duplicate history requires review.
  requireSafe(
    migrations.length === 1 &&
      migrations[0].migration_name === migrationName &&
      migrations[0].checksum === migrationHash &&
      migrations[0].finished_at instanceof Date &&
      Number.isFinite(migrations[0].finished_at.getTime()) &&
      migrations[0].rolled_back_at === null &&
      migrations[0].applied_steps_count === 1,
    "Successful reviewed Prisma migration could not be verified.",
  );
}

export async function verifyDatabaseIdentity(client, config) {
  const identities = await client.$queryRaw`
    SELECT current_database()::text AS database, current_user::text AS role,
           current_schema()::text AS schema, pg_is_in_recovery() AS replica`;
  const migrations = await client.$queryRaw`
    SELECT migration_name, checksum, finished_at, rolled_back_at, applied_steps_count
    FROM public."_prisma_migrations"`;
  requireSafe(identities.length === 1);
  validateDatabaseIdentity(config, identities[0], migrations);
}
