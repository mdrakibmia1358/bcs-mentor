import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  cleanChildEnvironment,
  overrideCases,
  secret,
} from "./helpers/fixtures.mjs";

const probe = fileURLToPath(
  new URL("./helpers/initialization-probe.mjs", import.meta.url),
);

function runProbe(mode, override) {
  const environment = cleanChildEnvironment();
  const args = [
    "--experimental-strip-types",
    "--conditions=react-server",
    probe,
    mode,
  ];
  if (override) {
    if (mode === "cached-environment" || mode === "cached-auth") {
      args.push(override.key, override.value);
    } else {
      environment[override.key] = override.value;
      args.push(override.key);
    }
  }
  const temporaryDirectory =
    mode === "schema"
      ? mkdtempSync(join(tmpdir(), "bcs-schema-guard-"))
      : undefined;
  let child;
  try {
    child = spawnSync(process.execPath, args, {
      env: environment,
      cwd: temporaryDirectory,
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 128 * 1024,
    });
    if (temporaryDirectory)
      assert.deepEqual(readdirSync(temporaryDirectory), []);
  } finally {
    if (temporaryDirectory)
      rmSync(temporaryDirectory, { recursive: true, force: true });
  }
  const output = `${child.stdout ?? ""}${child.stderr ?? ""}`;
  const sensitive = [
    secret,
    "fake_password",
    ...(override ? [override.value, ...(override.sensitiveParts ?? [])] : []),
  ].filter(Boolean);
  for (const value of sensitive) {
    // Do not pass output/value to assert: its diagnostic must stay redacted.
    assert.ok(
      !output.includes(value),
      "Probe output contains synthetic input.",
    );
  }
  assert.ok(!child.error, "Isolated probe could not finish.");
  assert.ok(child.status === 0, "Isolated probe failed; output withheld.");
  let result;
  try {
    result = JSON.parse(child.stdout);
  } catch {
    assert.fail("Probe did not return its sanitized result.");
  }
  assert.equal(result.network, 0);
  return result;
}

test("real server initialization preserves the singular secret and exact origin", () => {
  assert.equal(runProbe("valid").outcome, "approved");
});

for (const override of overrideCases) {
  test(`real server rejects ${override.name} without leaking input`, () => {
    assert.equal(runProbe("override", override).outcome, "rejected");
  });
  test(`schema generator rejects ${override.name} before file writes`, () => {
    assert.equal(runProbe("schema", override).outcome, "rejected");
  });
}

for (const key of [
  "BETTER_AUTH_SECRETS",
  "BETTER_AUTH_TRUSTED_ORIGINS",
  "BETTER_AUTH_TELEMETRY",
  "BETTER_AUTH_TELEMETRY_ENDPOINT",
  "BETTER_AUTH_TELEMETRY_DEBUG",
]) {
  test(`cached environment cannot conceal a newly defined ${key}`, () => {
    const override = overrideCases.find(
      (entry) => entry.key === key && entry.value,
    );
    assert.equal(runProbe("cached-environment", override).outcome, "rejected");
  });
  test(`cached auth rejects a newly defined ${key}`, () => {
    const override = overrideCases.find(
      (entry) => entry.key === key && entry.value,
    );
    assert.equal(runProbe("cached-auth", override).outcome, "rejected");
  });
}

test("a rejected child does not contaminate the next auth initialization", () => {
  assert.equal(runProbe("override", overrideCases[0]).outcome, "rejected");
  assert.equal(runProbe("valid").outcome, "approved");
});
