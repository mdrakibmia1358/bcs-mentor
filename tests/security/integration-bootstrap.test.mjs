import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { forbidNetwork } from "./helpers/offline.mjs";
import {
  baseline,
  root,
  reviewedFiles,
  verifyReviewedFiles,
  validateEnvironmentFile,
  validateEnvironmentGitState,
  readPrivateEnvironment,
} from "../integration/bootstrap.mjs";
import {
  createChildEnvironment,
  validateChildEnvironment,
  authorizeSpawnedChild,
} from "../integration/launch.mjs";

const network = forbidNetwork();
const temporary = mkdtempSync(join(tmpdir(), "bcs-integration-offline-"));
const probe = fileURLToPath(
  new URL("./helpers/integration-launch-probe.mjs", import.meta.url),
);
const suite = fileURLToPath(
  new URL("../integration/postgres.test.mjs", import.meta.url),
);

// Copies contain reviewed source bytes and synthetic fixtures only; never .env.
for (const path of Object.keys(reviewedFiles)) {
  mkdirSync(dirname(join(temporary, path)), { recursive: true });
  copyFileSync(join(root, path), join(temporary, path));
}

test("reviewed hashes match the pinned Git baseline and accept unchanged sources", () => {
  for (const [path, expected] of Object.entries(reviewedFiles)) {
    const bytes = execFileSync(
      "/usr/bin/git",
      ["show", `${baseline}:${path}`],
      { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
    );
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expected);
  }
  assert.doesNotThrow(() => verifyReviewedFiles(temporary));
});
for (const path of Object.keys(reviewedFiles)) {
  test(`reviewed source drift fails closed: ${path}`, () => {
    const file = join(temporary, path);
    const original = readFileSync(file);
    try {
      writeFileSync(
        file,
        Buffer.concat([original, Buffer.from("\n// unreviewed change\n")]),
      );
      assert.throws(() => verifyReviewedFiles(temporary));
    } finally {
      writeFileSync(file, original);
    }
  });
}

test("private environment reads only a regular current-user file with mode 600", () => {
  const file = join(temporary, "private.env");
  writeFileSync(file, "SYNTHETIC=offline-only\n", { mode: 0o600 });
  assert.equal(
    readPrivateEnvironment(file).toString(),
    "SYNTHETIC=offline-only\n",
  );
  for (const mode of [0o400, 0o640, 0o644, 0o660, 0o700, 0o1600]) {
    chmodSync(file, mode);
    assert.throws(() => readPrivateEnvironment(file));
  }
  chmodSync(file, 0o600);
  const link = join(temporary, "symlink.env");
  symlinkSync(file, link);
  assert.throws(() => readPrivateEnvironment(link));
  assert.throws(() => readPrivateEnvironment(temporary));
  assert.throws(() => readPrivateEnvironment(join(temporary, "missing.env")));
  const info = lstatSync(file);
  assert.throws(() => validateEnvironmentFile(info, info.uid + 1));
  assert.throws(() => validateEnvironmentFile(info, null));
});

test("private environment requires both ignored and untracked Git state", () => {
  assert.doesNotThrow(() => validateEnvironmentGitState(".env", ""));
  for (const [ignored, tracked] of [
    ["", ""],
    [".env", ".env"],
    ["", ".env"],
    [".env.local", ""],
  ]) {
    assert.throws(() => validateEnvironmentGitState(ignored, tracked));
  }
});

const hostile = {
  DATABASE_URL: "postgresql://synthetic:fake@unapproved.example.test/other",
  DIRECT_URL: "postgresql://synthetic:fake@unapproved.example.test/other",
  NEON_API_KEY: "synthetic-inherited-key",
  PGHOST: "unapproved.example.test",
  PGPASSWORD: "synthetic-password",
  PGSSLMODE: "disable",
  PGOPTIONS: "synthetic-options",
  NODE_OPTIONS: "--no-warnings",
  NODE_TLS_REJECT_UNAUTHORIZED: "0",
  NODE_EXTRA_CA_CERTS: "/synthetic/untrusted.pem",
  NODE_PATH: "/synthetic/modules",
  DEBUG: "*",
  NODE_DEBUG: "net,tls",
  SSLKEYLOGFILE: "/synthetic/keylog",
  GIT_DIR: "/synthetic/repository",
  GIT_CONFIG_GLOBAL: "/synthetic/config",
  PATH: "/synthetic/bin",
  TMPDIR: "/synthetic/tmp",
  BETTER_AUTH_SECRET: "synthetic-inherited-secret",
};

test("child environment construction excludes all inherited configuration", () => {
  const saved = {};
  try {
    for (const [key, value] of Object.entries(hostile)) {
      saved[key] = process.env[key];
      process.env[key] = value;
    }
    const runId = randomUUID();
    const environment = createChildEnvironment(runId);
    assert.deepEqual(environment, {
      ENABLE_NEON_INTEGRATION_TESTS: "1",
      BCS_INTEGRATION_CHILD: runId,
      NODE_ENV: "test",
    });
    assert.doesNotThrow(() => validateChildEnvironment(environment));
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
for (const [key, value] of Object.entries({
  ...hostile,
  CI: "",
  GITHUB_ACTIONS: "false",
})) {
  test(`child isolation rejects inherited ${key}`, () => {
    assert.throws(() =>
      validateChildEnvironment({
        ...createChildEnvironment(randomUUID()),
        [key]: value,
      }),
    );
  });
}

async function subprocess(args, environment, approve) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: environment,
    stdio: ["ignore", "pipe", "pipe", approve ? "pipe" : "ignore"],
  });
  let output = "";
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill("SIGKILL");
  }, 10_000);
  child.stdout.on("data", (chunk) => {
    if (output.length < 65_536) output += chunk.toString();
  });
  // No raw child diagnostics are included in assertion output.
  child.stderr.resume();
  const approval = approve ? approve(child) : Promise.resolve();
  try {
    const code = await new Promise((resolve) => {
      child.once("error", () => resolve(-1));
      child.once("close", (status) => resolve(status));
    });
    await approval;
    assert.ok(!timedOut, "Offline launch probe must finish without timeout.");
    assert.ok(
      output.includes("OFFLINE_BOUNDARY_PASSED"),
      "No protected reads/imports or network attempts are permitted.",
    );
    return { code, output };
  } finally {
    clearTimeout(timeout);
  }
}

const directArguments = [
  "--experimental-strip-types",
  "--conditions=react-server",
  "--import",
  probe,
  "--test",
  "--experimental-test-isolation=none",
  suite,
];
test("default direct discovery skips without loading credentials or networking", async () => {
  const result = await subprocess(directArguments, {}, null);
  assert.equal(result.code, 0);
  assert.ok(result.output.includes("# skipped 1"));
});
test("direct invocation rejects a fabricated UUID even with an otherwise isolated environment", async () => {
  const result = await subprocess(
    directArguments,
    createChildEnvironment(randomUUID()),
    null,
  );
  assert.notEqual(result.code, 0);
  assert.ok(!result.output.includes("approved PostgreSQL integration"));
});
test("direct invocation rejects a fabricated UUID and hostile inherited configuration", async () => {
  // Only harmless runtime flags execute before the gate; all values are synthetic.
  const result = await subprocess(
    directArguments,
    {
      ...createChildEnvironment(randomUUID()),
      DATABASE_URL: hostile.DATABASE_URL,
      PGHOST: hostile.PGHOST,
      NODE_OPTIONS: hostile.NODE_OPTIONS,
      NODE_TLS_REJECT_UNAUTHORIZED: "0",
    },
    null,
  );
  assert.notEqual(result.code, 0);
});
test("isolated child accepts a genuine private-pipe handshake without running live tests", async () => {
  const runId = randomUUID();
  const result = await subprocess(
    [probe, "authorize-only"],
    createChildEnvironment(runId),
    (child) => authorizeSpawnedChild(child, runId),
  );
  assert.equal(result.code, 0);
  assert.ok(result.output.includes("LAUNCH_AUTHORIZED"));
});
test("private pipe cannot authorize hostile child configuration", async () => {
  const runId = randomUUID();
  const result = await subprocess(
    [probe, "authorize-only"],
    { ...createChildEnvironment(runId), PGHOST: hostile.PGHOST },
    (child) => authorizeSpawnedChild(child, runId),
  );
  assert.notEqual(result.code, 0);
  assert.ok(!result.output.includes("LAUNCH_AUTHORIZED"));
});
test("private pipe rejects an approval for a different run", async () => {
  const result = await subprocess(
    [probe, "authorize-only"],
    createChildEnvironment(randomUUID()),
    (child) => authorizeSpawnedChild(child, randomUUID()),
  );
  assert.notEqual(result.code, 0);
});
test("private pipe rejects a fabricated reply", async () => {
  const result = await subprocess(
    [probe, "authorize-only"],
    createChildEnvironment(randomUUID()),
    async (child) => {
      child.stdio[3].on("error", () => {});
      child.stdio[3].end(
        JSON.stringify({
          nonce: randomUUID(),
          runId: randomUUID(),
          parentPid: process.pid,
        }) + "\n",
      );
    },
  );
  assert.notEqual(result.code, 0);
});

test.after(() => {
  rmSync(temporary, { recursive: true, force: true });
  assert.equal(network.attempts, 0);
  network.restore();
});
