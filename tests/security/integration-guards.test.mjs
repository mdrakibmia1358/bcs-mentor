import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { forbidNetwork } from "./helpers/offline.mjs";

const network = forbidNetwork();
const {
  pooledHost,
  directHost,
  endpointId,
  migrationName,
  migrationHash,
  requireOptIn,
  validateConfiguration,
  validateNeonIdentity,
  validateDatabaseIdentity,
  verifyNeonIdentity,
} = await import("../integration/guards.mjs");

// Synthetic values only. No .env, PostgreSQL client, or live runner is loaded.
function fixture() {
  return {
    NODE_ENV: "test",
    DATABASE_URL: `postgresql://synthetic:fake_password@${pooledHost}/neondb?sslmode=verify-full&channel_binding=require`,
    DIRECT_URL: `postgresql://synthetic:fake_password@${directHost}/neondb?sslmode=verify-full&channel_binding=require`,
    BETTER_AUTH_URL: "http://localhost:3000",
    BETTER_AUTH_SECRET: "synthetic-integration-only-secret-0123456789-ABCxyz",
    NEON_PROJECT_ID: "old-hill-91650824",
    NEON_INTEGRATION_BRANCH_ID: "br-soft-snow-aokt2rxj",
    NEON_API_KEY: "synthetic-api-key-never-sent",
  };
}

function metadata(config) {
  return {
    endpoint: {
      id: endpointId,
      project_id: config.projectId,
      branch_id: config.branchId,
      host: directHost,
      type: "read_write",
    },
    branch: {
      id: config.branchId,
      project_id: config.projectId,
      default: false,
      protected: false,
      current_state: "ready",
    },
  };
}

function database(config) {
  return {
    identity: {
      database: "neondb",
      role: config.role,
      schema: "public",
      replica: false,
    },
    migrations: [
      {
        migration_name: migrationName,
        checksum: migrationHash,
        finished_at: new Date(),
        rolled_back_at: null,
        applied_steps_count: 1,
      },
    ],
  };
}

for (const value of [undefined, "", "0", "true", "yes", " 1", "1 "]) {
  test(`integration opt-in rejects ${JSON.stringify(value) ?? "absence"}`, () => {
    assert.throws(() => requireOptIn({ ENABLE_NEON_INTEGRATION_TESTS: value }));
  });
}
test("integration opt-in accepts only explicit 1 outside CI", () => {
  assert.doesNotThrow(() =>
    requireOptIn({ ENABLE_NEON_INTEGRATION_TESTS: "1" }),
  );
  for (const key of ["CI", "GITHUB_ACTIONS"]) {
    for (const value of ["", "false", "true"]) {
      assert.throws(() =>
        requireOptIn({ ENABLE_NEON_INTEGRATION_TESTS: "1", [key]: value }),
      );
    }
  }
});

test("integration URLs and production environment validation accept the exact approved target", () => {
  const config = validateConfiguration(fixture());
  assert.ok(new URL(config.runtime.DATABASE_URL).hostname === pooledHost);
  assert.ok(new URL(config.directURL).hostname === directHost);
});

const urlChanges = [
  [
    "different host",
    (url) => {
      url.hostname = "unapproved.example.test";
    },
  ],
  [
    "host suffix attack",
    (url) => {
      url.hostname += ".example.test";
    },
  ],
  [
    "uppercase host",
    (url) => {
      url.hostname = url.hostname.toUpperCase();
    },
  ],
  [
    "trailing dot",
    (url) => {
      url.hostname += ".";
    },
  ],
  [
    "different database",
    (url) => {
      url.pathname = "/production";
    },
  ],
  [
    "encoded database",
    (url) => {
      url.pathname = "/%6eeondb";
    },
  ],
  [
    "different port",
    (url) => {
      url.port = "6543";
    },
  ],
  [
    "weak TLS",
    (url) => {
      url.searchParams.set("sslmode", "require");
    },
  ],
  [
    "missing channel binding",
    (url) => {
      url.searchParams.delete("channel_binding");
    },
  ],
  [
    "weak channel binding",
    (url) => {
      url.searchParams.set("channel_binding", "prefer");
    },
  ],
  [
    "duplicate parameter",
    (url) => {
      url.searchParams.append("sslmode", "verify-full");
    },
  ],
  [
    "connection override",
    (url) => {
      url.searchParams.set("host", "localhost");
    },
  ],
  [
    "fragment",
    (url) => {
      url.hash = "unexpected";
    },
  ],
  [
    "missing password",
    (url) => {
      url.password = "";
    },
  ],
];
for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
  for (const [name, mutate] of urlChanges) {
    test(`integration rejects ${key}: ${name}`, () => {
      const source = fixture();
      const url = new URL(source[key]);
      mutate(url);
      source[key] = url.href;
      assert.throws(() => validateConfiguration(source), /Values are hidden/);
    });
  }
}

for (const [name, change] of [
  [
    "mismatched role",
    (source) => {
      source.DIRECT_URL = source.DIRECT_URL.replace("synthetic:", "other:");
    },
  ],
  [
    "mismatched password",
    (source) => {
      source.DIRECT_URL = source.DIRECT_URL.replace(
        "fake_password",
        "other_password",
      );
    },
  ],
  [
    "production runtime",
    (source) => {
      source.NODE_ENV = "production";
    },
  ],
  [
    "unsupported auth override",
    (source) => {
      source.BETTER_AUTH_SECRETS = "";
    },
  ],
  [
    "absent API key",
    (source) => {
      delete source.NEON_API_KEY;
    },
  ],
  [
    "absent expected branch",
    (source) => {
      delete source.NEON_INTEGRATION_BRANCH_ID;
    },
  ],
  [
    "project path injection",
    (source) => {
      source.NEON_PROJECT_ID = "../other-project";
    },
  ],
]) {
  test(`integration configuration rejects ${name} with redacted errors`, () => {
    const source = fixture();
    change(source);
    assert.throws(
      () => validateConfiguration(source),
      (error) => {
        assert.deepEqual(Object.getOwnPropertyNames(error).sort(), [
          "message",
          "stack",
        ]);
        for (const value of Object.values(source)) {
          if (value && value.length > 10)
            assert.ok(
              !error.stack.includes(value),
              "Configuration leaked input.",
            );
        }
        return error.message.includes("Values are hidden");
      },
    );
  });
}

for (const [name, change] of [
  [
    "default branch",
    (data) => {
      data.branch.default = true;
    },
  ],
  [
    "unknown default status",
    (data) => {
      delete data.branch.default;
    },
  ],
  [
    "protected branch",
    (data) => {
      data.branch.protected = true;
    },
  ],
  [
    "unknown protection status",
    (data) => {
      delete data.branch.protected;
    },
  ],
  [
    "non-ready branch",
    (data) => {
      data.branch.current_state = "init";
    },
  ],
  [
    "wrong branch",
    (data) => {
      data.endpoint.branch_id = "br-other";
    },
  ],
  [
    "wrong project",
    (data) => {
      data.branch.project_id = "other";
    },
  ],
  [
    "wrong endpoint",
    (data) => {
      data.endpoint.id = "ep-other";
    },
  ],
  [
    "wrong endpoint host",
    (data) => {
      data.endpoint.host = "other.example.test";
    },
  ],
  [
    "read-only endpoint",
    (data) => {
      data.endpoint.type = "read_only";
    },
  ],
]) {
  test(`integration branch verification refuses ${name}`, () => {
    const config = validateConfiguration(fixture());
    const data = metadata(config);
    change(data);
    assert.throws(() =>
      validateNeonIdentity(config, data.endpoint, data.branch),
    );
  });
}

test("Neon verification uses only fixed GET endpoints without redirects", async () => {
  const config = validateConfiguration(fixture());
  const data = metadata(config);
  const calls = [];
  await verifyNeonIdentity(config, async (url, options) => {
    calls.push(url);
    assert.equal(options.method, "GET");
    assert.equal(options.redirect, "error");
    assert.ok(options.signal instanceof AbortSignal);
    return { ok: true, json: async () => data };
  });
  assert.deepEqual(calls, [
    `https://console.neon.tech/api/v2/projects/${config.projectId}/endpoints/${endpointId}`,
    `https://console.neon.tech/api/v2/projects/${config.projectId}/branches/${config.branchId}`,
  ]);
});

test("Neon network/API failures fail closed without exposing response diagnostics", async () => {
  const config = validateConfiguration(fixture());
  for (const fetcher of [
    async () => {
      throw new Error(config.apiKey);
    },
    async () => ({ ok: false, json: async () => ({ message: config.apiKey }) }),
    async () => ({
      ok: true,
      json: async () => {
        throw new Error(config.apiKey);
      },
    }),
  ]) {
    await assert.rejects(verifyNeonIdentity(config, fetcher), (error) => {
      assert.ok(!error.stack.includes(config.apiKey));
      assert.deepEqual(Object.getOwnPropertyNames(error).sort(), [
        "message",
        "stack",
      ]);
      return /No write is authorized/.test(error.message);
    });
  }
});

test("database identity requires the successful reviewed migration", () => {
  const config = validateConfiguration(fixture());
  const data = database(config);
  assert.doesNotThrow(() =>
    validateDatabaseIdentity(config, data.identity, data.migrations),
  );
});
for (const [name, change] of [
  [
    "wrong database",
    (data) => {
      data.identity.database = "other";
    },
  ],
  [
    "wrong role",
    (data) => {
      data.identity.role = "other";
    },
  ],
  [
    "wrong schema",
    (data) => {
      data.identity.schema = "other";
    },
  ],
  [
    "replica",
    (data) => {
      data.identity.replica = true;
    },
  ],
  [
    "missing migration",
    (data) => {
      data.migrations = [];
    },
  ],
  [
    "unexpected migration",
    (data) => {
      data.migrations.push({ ...data.migrations[0] });
    },
  ],
  [
    "wrong migration",
    (data) => {
      data.migrations[0].migration_name = "unreviewed";
    },
  ],
  [
    "checksum mismatch",
    (data) => {
      data.migrations[0].checksum = "changed";
    },
  ],
  [
    "unfinished migration",
    (data) => {
      data.migrations[0].finished_at = null;
    },
  ],
  [
    "rolled-back migration",
    (data) => {
      data.migrations[0].rolled_back_at = new Date();
    },
  ],
  [
    "unapplied migration",
    (data) => {
      data.migrations[0].applied_steps_count = 0;
    },
  ],
]) {
  test(`database preflight refuses ${name}`, () => {
    const config = validateConfiguration(fixture());
    const data = database(config);
    change(data);
    assert.throws(() =>
      validateDatabaseIdentity(config, data.identity, data.migrations),
    );
  });
}

test("live integration remains a separate script from the unchanged offline suite", () => {
  const { scripts } = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url)),
  );
  assert.equal(
    scripts["test:security"],
    "prisma generate && node --experimental-strip-types --conditions=react-server --test tests/security/*.test.mjs",
  );
  assert.equal(
    scripts["test:integration"],
    "node --experimental-strip-types scripts/run-db-integration-tests.mjs",
  );
});

test.after(() => {
  assert.equal(network.attempts, 0);
  network.restore();
});

for (const [key, value] of [
  ["NEON_PROJECT_ID", "another-valid-project-12345678"],
  ["NEON_INTEGRATION_BRANCH_ID", "br-another-valid-branch"],
]) {
  test(`integration rejects alternative valid ${key}`, () => {
    assert.throws(
      () => validateConfiguration({ ...fixture(), [key]: value }),
      /configuration is missing or unsafe/,
    );
  });
}
