import assert from "node:assert/strict";
import { inspect } from "node:util";
import test from "node:test";
import {
  readRuntimeEnvironment,
  readMigrationEnvironment,
} from "../../src/lib/env.ts";
import { overrideCases, secret } from "./helpers/fixtures.mjs";

// The environment groups retain the audited temporary harness's parser coverage.
const base = {
  NODE_ENV: "development",
  DATABASE_URL:
    "postgresql://test_user:fake_password@localhost:5432/synthetic_db",
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: secret,
};

function rejected(reader, source, expectedKey, additionalSensitive = []) {
  let error;
  try {
    reader(source);
  } catch (caught) {
    error = caught;
  }
  assert.ok(
    error instanceof Error,
    "Expected sanitized configuration rejection.",
  );
  assert.ok(
    /^(?:Invalid|Unsupported) environment configuration(?:: [A-Z_, ]+)?\. Values are hidden\.$/.test(
      error.message,
    ),
    "Configuration error must contain variable names only.",
  );
  if (expectedKey) assert.ok(error.message.includes(expectedKey));
  assert.deepEqual(Object.getOwnPropertyNames(error).sort(), [
    "message",
    "stack",
  ]);
  assert.ok(error.input === undefined && error.cause === undefined);
  const diagnostic = inspect(error, { showHidden: true, depth: 10 });
  for (const value of [
    secret,
    "fake_password",
    "test_user",
    "postgresql://",
    "synthetic_db",
    "synthetic-secret",
    ...additionalSensitive,
  ].filter(Boolean)) {
    assert.ok(
      !diagnostic.includes(value),
      "Exception retained synthetic input.",
    );
  }
  return error;
}

test("missing runtime variables fail with sanitized names only", () => {
  const error = rejected(readRuntimeEnvironment, {});
  assert.equal(
    error.message,
    "Invalid environment configuration: DATABASE_URL, BETTER_AUTH_URL, BETTER_AUTH_SECRET. Values are hidden.",
  );
});

test("missing DIRECT_URL fails with its sanitized name only", () => {
  rejected(readMigrationEnvironment, {}, "DIRECT_URL");
});

for (const [name, reader, source] of [
  [
    "malformed runtime DATABASE_URL",
    readRuntimeEnvironment,
    { ...base, DATABASE_URL: "not-a-url-synthetic-secret" },
  ],
  [
    "malformed runtime database authority",
    readRuntimeEnvironment,
    { ...base, DATABASE_URL: "postgresql://user:synthetic-secret@[]/db" },
  ],
  [
    "malformed BETTER_AUTH_URL",
    readRuntimeEnvironment,
    { ...base, BETTER_AUTH_URL: "not-a-url-synthetic-secret" },
  ],
  [
    "malformed auth authority",
    readRuntimeEnvironment,
    { ...base, BETTER_AUTH_URL: "https://user:synthetic-secret@[]/" },
  ],
  [
    "malformed DIRECT_URL",
    readMigrationEnvironment,
    { DIRECT_URL: "not-a-url-synthetic-secret" },
  ],
  [
    "malformed direct database authority",
    readMigrationEnvironment,
    { DIRECT_URL: "postgresql://user:synthetic-secret@[]/db" },
  ],
]) {
  test(`${name} redacts all exception properties`, () =>
    rejected(reader, source));
}

test("synthetic loopback development environment is accepted", () => {
  assert.equal(
    readRuntimeEnvironment(base).BETTER_AUTH_URL,
    base.BETTER_AUTH_URL,
  );
});

for (const [name, patch, key] of [
  [
    "remote HTTP application origin",
    { BETTER_AUTH_URL: "http://app.example.test" },
    "BETTER_AUTH_URL",
  ],
  [
    "production loopback HTTP origin",
    { NODE_ENV: "production" },
    "BETTER_AUTH_URL",
  ],
  [
    "origin userinfo",
    { BETTER_AUTH_URL: "https://name:fake_password@app.example.test" },
    "BETTER_AUTH_URL",
  ],
  [
    "origin path",
    { BETTER_AUTH_URL: "https://app.example.test/not-origin" },
    "BETTER_AUTH_URL",
  ],
  [
    "origin query",
    { BETTER_AUTH_URL: "https://app.example.test?key=private" },
    "BETTER_AUTH_URL",
  ],
  [
    "origin fragment",
    { BETTER_AUTH_URL: "https://app.example.test#private" },
    "BETTER_AUTH_URL",
  ],
  [
    "low entropy secret",
    { BETTER_AUTH_SECRET: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
    "BETTER_AUTH_SECRET",
  ],
  [
    "short secret",
    { BETTER_AUTH_SECRET: "short-secret" },
    "BETTER_AUTH_SECRET",
  ],
  [
    "remote database without TLS mode",
    {
      DATABASE_URL:
        "postgresql://test_user:fake_password@db.example.test/synthetic_db",
    },
    "DATABASE_URL",
  ],
  [
    "remote database TLS disable",
    {
      DATABASE_URL:
        "postgresql://test_user:fake_password@db.example.test/synthetic_db?sslmode=disable",
    },
    "DATABASE_URL",
  ],
  [
    "remote database TLS require downgrade",
    {
      DATABASE_URL:
        "postgresql://test_user:fake_password@db.example.test/synthetic_db?sslmode=require",
    },
    "DATABASE_URL",
  ],
  [
    "remote database verify-ca downgrade",
    {
      DATABASE_URL:
        "postgresql://test_user:fake_password@db.example.test/synthetic_db?sslmode=verify-ca",
    },
    "DATABASE_URL",
  ],
  [
    "production local database without verified TLS",
    { NODE_ENV: "production", BETTER_AUTH_URL: "https://app.example.test" },
    "DATABASE_URL",
  ],
  [
    "non-PostgreSQL database protocol",
    {
      DATABASE_URL:
        "https://test_user:fake_password@db.example.test/synthetic_db?sslmode=verify-full",
    },
    "DATABASE_URL",
  ],
  [
    "database missing name",
    { DATABASE_URL: "postgresql://test_user:fake_password@localhost:5432/" },
    "DATABASE_URL",
  ],
  [
    "duplicate SSL query",
    {
      DATABASE_URL:
        "postgresql://test_user:fake_password@db.example.test/synthetic_db?sslmode=verify-full&sslmode=disable",
    },
    "DATABASE_URL",
  ],
  [
    "query SSL boolean override",
    {
      DATABASE_URL:
        "postgresql://test_user:fake_password@db.example.test/synthetic_db?sslmode=verify-full&ssl=false",
    },
    "DATABASE_URL",
  ],
  [
    "query host override",
    {
      DATABASE_URL:
        "postgresql://test_user:fake_password@db.example.test/synthetic_db?sslmode=verify-full&host=localhost",
    },
    "DATABASE_URL",
  ],
  [
    "query libpq compatibility override",
    {
      DATABASE_URL:
        "postgresql://test_user:fake_password@db.example.test/synthetic_db?sslmode=verify-full&uselibpqcompat=true",
    },
    "DATABASE_URL",
  ],
  [
    "uppercase Neon direct runtime URL",
    {
      DATABASE_URL:
        "postgresql://test_user:fake_password@EP-SYNTHETIC.REGION.AWS.NEON.TECH/synthetic_db?sslmode=verify-full",
    },
    "DATABASE_URL",
  ],
  [
    "trailing-dot Neon direct runtime URL",
    {
      DATABASE_URL:
        "postgresql://test_user:fake_password@ep-synthetic.region.aws.neon.tech./synthetic_db?sslmode=verify-full",
    },
    "DATABASE_URL",
  ],
  [
    "percent-encoded database hostname",
    {
      DATABASE_URL:
        "postgresql://test_user:fake_password@ep-synthetic.region.aws.neon%2Etech/synthetic_db?sslmode=verify-full",
    },
    "DATABASE_URL",
  ],
  [
    "Neon direct runtime URL",
    {
      DATABASE_URL:
        "postgresql://test_user:fake_password@ep-synthetic.region.aws.neon.tech/synthetic_db?sslmode=verify-full",
    },
    "DATABASE_URL",
  ],
]) {
  test(`${name} is rejected`, () =>
    rejected(readRuntimeEnvironment, { ...base, ...patch }, key));
}

test("production HTTPS and verified database TLS are accepted", () => {
  assert.equal(
    readRuntimeEnvironment({
      ...base,
      NODE_ENV: "production",
      BETTER_AUTH_URL: "https://app.example.test",
      DATABASE_URL:
        "postgresql://test_user:fake_password@db.example.test/synthetic_db?sslmode=verify-full",
    }).NODE_ENV,
    "production",
  );
});

test("Neon pooled runtime URL is accepted", () => {
  readRuntimeEnvironment({
    ...base,
    DATABASE_URL:
      "postgresql://test_user:fake_password@ep-synthetic-pooler.region.aws.neon.tech/synthetic_db?sslmode=verify-full&channel_binding=require",
  });
});

test("Neon unpooled DIRECT_URL is accepted", () => {
  readMigrationEnvironment({
    DIRECT_URL:
      "postgresql://test_user:fake_password@ep-synthetic.region.aws.neon.tech/synthetic_db?sslmode=verify-full",
  });
});

for (const [name, value] of [
  [
    "Neon pooled DIRECT_URL",
    "postgresql://test_user:fake_password@ep-synthetic-pooler.region.aws.neon.tech/synthetic_db?sslmode=verify-full",
  ],
  [
    "remote DIRECT_URL TLS downgrade",
    "postgresql://test_user:fake_password@db.example.test/synthetic_db?sslmode=require",
  ],
]) {
  test(`${name} is rejected`, () =>
    rejected(readMigrationEnvironment, { DIRECT_URL: value }, "DIRECT_URL"));
}

for (const override of overrideCases) {
  test(`environment parser rejects ${override.name} without retaining its value`, () => {
    const source = { ...base, [override.key]: override.value };
    rejected(readRuntimeEnvironment, source, override.key, [
      override.value,
      ...(override.sensitiveParts ?? []),
    ]);
    assert.ok(
      source[override.key] === override.value,
      "Rejected source was mutated.",
    );
  });
}
