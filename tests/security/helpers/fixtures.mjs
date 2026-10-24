// These credentials and reserved .test addresses are synthetic fixtures only.
export const secret = "synthetic-offline-only-secret-0123456789-ABCxyz";
export const origin = "https://app.example.test";
export const foreignOrigin = "https://unapproved.example.test";
export const databaseURL =
  "postgresql://test_user:fake_password@localhost:5432/synthetic_db";
export const runtimeEnvironment = {
  NODE_ENV: "test",
  DATABASE_URL: databaseURL,
  BETTER_AUTH_URL: origin,
  BETTER_AUTH_SECRET: secret,
};

export const overrideCases = [
  {
    name: "weak versioned secret",
    key: "BETTER_AUTH_SECRETS",
    value: "42:~",
    sensitiveParts: ["~"],
  },
  {
    name: "valid versioned secret",
    key: "BETTER_AUTH_SECRETS",
    value: "42:synthetic-unapproved-rotation-0123456789-ABCxyz",
    sensitiveParts: ["synthetic-unapproved-rotation-0123456789-ABCxyz"],
  },
  { name: "empty rotation override", key: "BETTER_AUTH_SECRETS", value: "" },
  {
    name: "malformed versioned secret",
    key: "BETTER_AUTH_SECRETS",
    value: "synthetic-malformed-rotation-sentinel",
  },
  {
    name: "additional trusted origin",
    key: "BETTER_AUTH_TRUSTED_ORIGINS",
    value: foreignOrigin,
  },
  {
    name: "empty trusted origins override",
    key: "BETTER_AUTH_TRUSTED_ORIGINS",
    value: "",
  },
  {
    name: "multiple trusted origins",
    key: "BETTER_AUTH_TRUSTED_ORIGINS",
    value: `${foreignOrigin},https://another-unapproved.example.test`,
    sensitiveParts: [foreignOrigin, "https://another-unapproved.example.test"],
  },
  {
    name: "wildcard trusted origin",
    key: "BETTER_AUTH_TRUSTED_ORIGINS",
    value: "https://*.unapproved.example.test",
  },
  {
    name: "malformed trusted origin",
    key: "BETTER_AUTH_TRUSTED_ORIGINS",
    value: "synthetic-malformed-origin-sentinel",
  },
  { name: "telemetry activation", key: "BETTER_AUTH_TELEMETRY", value: "true" },
  {
    name: "telemetry false override",
    key: "BETTER_AUTH_TELEMETRY",
    value: "false",
  },
  { name: "empty telemetry override", key: "BETTER_AUTH_TELEMETRY", value: "" },
  {
    name: "malformed telemetry override",
    key: "BETTER_AUTH_TELEMETRY",
    value: "synthetic-telemetry-sentinel",
  },
  {
    name: "telemetry endpoint override",
    key: "BETTER_AUTH_TELEMETRY_ENDPOINT",
    value:
      "https://collector.example.test/capture?key=synthetic-endpoint-sentinel",
    sensitiveParts: ["synthetic-endpoint-sentinel"],
  },
  {
    name: "empty telemetry endpoint",
    key: "BETTER_AUTH_TELEMETRY_ENDPOINT",
    value: "",
  },
  {
    name: "malformed telemetry endpoint",
    key: "BETTER_AUTH_TELEMETRY_ENDPOINT",
    value: "synthetic-malformed-endpoint-sentinel",
  },
  {
    name: "telemetry debug activation",
    key: "BETTER_AUTH_TELEMETRY_DEBUG",
    value: "true",
  },
  {
    name: "telemetry debug false override",
    key: "BETTER_AUTH_TELEMETRY_DEBUG",
    value: "false",
  },
  {
    name: "empty telemetry debug override",
    key: "BETTER_AUTH_TELEMETRY_DEBUG",
    value: "",
  },
];

// Child processes inherit no developer credentials, dotenv preload, or auth
// settings. PATH and the temporary-directory settings are operational only.
export function cleanChildEnvironment() {
  const environment = { ...runtimeEnvironment };
  for (const key of ["PATH", "TMPDIR", "TMP", "TEMP", "SystemRoot"]) {
    if (process.env[key] !== undefined) environment[key] = process.env[key];
  }
  return environment;
}
