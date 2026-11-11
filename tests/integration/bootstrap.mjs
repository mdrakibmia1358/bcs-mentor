// Built-ins only: verify reviewed code before importing validators or dependencies.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  constants,
  closeSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../../", import.meta.url));
export const baseline = "2b8f4e7dd57f175c8cd3483a12e08e3b592a99f1";
export const gitBranch = "feat/auth-db-integration";
export const migrationName = "20261024000000_auth_foundation";
export const migrationHash =
  "ef1e655341013eea49418814662302d3b0c82d24ded18d65ca96f720f465a1a5";
const schemaHash =
  "548508d29322d60755291f35364ea0a9a475b3b01701577025446f2cc3502bfc";

export const checkNames = Object.freeze([
  "approved PostgreSQL integration",
  "pooled Prisma connection and simple queries",
  "synthetic User CRUD",
  "duplicate email unique constraint",
  "duplicate session token unique constraint",
  "Session foreign key enforcement",
  "Account foreign key enforcement",
  "cascading deletion of related records",
  "transaction rollback",
  "cleanup of current-run records",
]);

// Never attach input, caught exceptions, or driver/API responses to errors.
export function requireSafe(
  condition,
  message = "Integration safety check failed.",
) {
  if (!condition) throw new Error(message);
}

export function requireOptIn(environment) {
  requireSafe(
    environment.ENABLE_NEON_INTEGRATION_TESTS === "1",
    "Integration tests are disabled; explicit manual opt-in is required.",
  );
  requireSafe(
    environment.CI === undefined && environment.GITHUB_ACTIONS === undefined,
    "Integration tests are not permitted in CI.",
  );
}

// Hashes are pinned to the reviewed baseline, never to mutable HEAD/index content.
export const reviewedFiles = Object.freeze({
  "src/lib/db.server.ts":
    "2d9bbb2d312b929f4648a4addf246696900b80913397f7e7c46e0ee53c95e6d1",
  "src/lib/env.server.ts":
    "1277ea1c2bbde5a3a17565e6ff8e70f7fae5f226126afee783f5535d23b21dfe",
  "src/lib/env.ts":
    "d8d068a70373f0591e8a54c7723333c5eafac7385ccc167ce94e7eed59734f71",
  "tests/security/helpers/server-resolver.mjs":
    "fc17187abef13a5859c482dac84c602993e86871d42ac82c46d9c5c41bb90164",
  "package-lock.json":
    "8980b43de7012baf2e0d6325ab3b5b9c81310fd8c72267d3b154aa3c1aa24fb5",
  "prisma/schema.prisma": schemaHash,
  [`prisma/migrations/${migrationName}/migration.sql`]: migrationHash,
});

export function verifyReviewedFiles(directory = root) {
  for (const [path, expected] of Object.entries(reviewedFiles)) {
    const file = join(directory, path);
    const info = lstatSync(file);
    requireSafe(info.isFile() && !info.isSymbolicLink());
    requireSafe(
      createHash("sha256").update(readFileSync(file)).digest("hex") ===
        expected,
    );
  }
}

export function validateEnvironmentFile(info, uid = process.getuid?.()) {
  requireSafe(Number.isInteger(uid));
  requireSafe(info.isFile() && !info.isSymbolicLink());
  requireSafe(info.uid === uid && (info.mode & 0o7777) === 0o600);
}

// O_NOFOLLOW and fstat protect the actual opened file, not just a prior pathname.
export function readPrivateEnvironment(file = join(root, ".env")) {
  let fd;
  try {
    validateEnvironmentFile(lstatSync(file));
    fd = openSync(
      file,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    validateEnvironmentFile(fstatSync(fd));
    return readFileSync(fd);
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function git(...args) {
  return execFileSync("/usr/bin/git", args, {
    cwd: root,
    env: {
      PATH: "/usr/bin:/bin",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_OPTIONAL_LOCKS: "0",
    },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 5_000,
  }).trim();
}

export function validateEnvironmentGitState(ignored, tracked) {
  requireSafe(ignored === ".env" && tracked === "");
}

export function requireLocalContext() {
  try {
    requireSafe(
      realpathSync(git("rev-parse", "--show-toplevel")) === realpathSync(root),
    );
    requireSafe(git("branch", "--show-current") === gitBranch);
    git("merge-base", "--is-ancestor", baseline, "HEAD");
    validateEnvironmentGitState(
      git("check-ignore", "--", ".env"),
      git("ls-files", "--", ".env"),
    );
    validateEnvironmentFile(lstatSync(join(root, ".env")));
    verifyReviewedFiles();
  } catch {
    throw new Error(
      "Local branch, private .env, or reviewed integration sources could not be verified.",
    );
  }
}
