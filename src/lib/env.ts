import { z } from "zod";

type EnvironmentSource = Record<string, string | undefined>;

// Better Auth reads these overrides independently of explicit application
// options. Phase A supports one secret/origin and no telemetry configuration.
export function assertSupportedAuthEnvironment(source: EnvironmentSource) {
  const unsupported = [
    "BETTER_AUTH_SECRETS",
    "BETTER_AUTH_TRUSTED_ORIGINS",
    "BETTER_AUTH_TELEMETRY",
    "BETTER_AUTH_TELEMETRY_ENDPOINT",
    "BETTER_AUTH_TELEMETRY_DEBUG",
  ].filter((name) => source[name] !== undefined);

  if (unsupported.length) {
    throw new Error(
      `Unsupported environment configuration: ${unsupported.join(", ")}. Values are hidden.`,
    );
  }
}

const nodeEnvironment = z
  .enum(["development", "test", "production"])
  .default("development");

function isLoopback(hostname: string) {
  return ["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname);
}

const urlValue = z
  .string()
  .url()
  .transform((value) => new URL(value));

const postgresUrl = urlValue
  .superRefine((url, context) => {
    // PostgreSQL URLs use a non-special scheme: WHATWG does not canonicalize
    // hostname case/trailing dots, while DNS and the pg driver do.
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    if (hostname.includes("%")) {
      context.addIssue({
        code: "custom",
        message: "Encoded database hosts are unsupported",
      });
    }
    url.hostname = hostname;
    if (!["postgres:", "postgresql:"].includes(url.protocol)) {
      context.addIssue({ code: "custom", message: "PostgreSQL URL required" });
    }
    if (!url.hostname || !url.pathname.slice(1) || url.hash) {
      context.addIssue({
        code: "custom",
        message: "Database host and name required",
      });
    }
    // pg accepts connection overrides in query parameters and uses the last
    // duplicate value. Validate the same unambiguous URL we pass to the driver.
    const supportedParameters = new Set([
      "sslmode",
      "channel_binding",
      "application_name",
      "connect_timeout",
    ]);
    const seen = new Set<string>();
    for (const [key] of url.searchParams) {
      if (!supportedParameters.has(key) || seen.has(key)) {
        context.addIssue({
          code: "custom",
          message: "Unsupported database URL parameter",
        });
      }
      seen.add(key);
    }
    if (
      !isLoopback(url.hostname) &&
      url.searchParams.get("sslmode") !== "verify-full"
    ) {
      context.addIssue({ code: "custom", message: "Verified TLS required" });
    }
  })
  .transform((url) => url.toString());

const runtimeEnvironment = z
  .object({
    NODE_ENV: nodeEnvironment,
    DATABASE_URL: postgresUrl,
    BETTER_AUTH_URL: urlValue,
    BETTER_AUTH_SECRET: z
      .string()
      .min(32)
      .refine((value) => new Set(value).size >= 10),
  })
  .superRefine((environment, context) => {
    const origin = environment.BETTER_AUTH_URL;
    const database = new URL(environment.DATABASE_URL);

    if (
      !["http:", "https:"].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash ||
      (origin.protocol === "http:" &&
        (environment.NODE_ENV === "production" || !isLoopback(origin.hostname)))
    ) {
      context.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_URL"],
        message: "Safe application origin required",
      });
    }

    if (
      environment.NODE_ENV === "production" &&
      database.searchParams.get("sslmode") !== "verify-full"
    ) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "Verified TLS required in production",
      });
    }

    if (
      database.hostname.endsWith(".neon.tech") &&
      !database.hostname.includes("-pooler.")
    ) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "Pooled Neon runtime URL required",
      });
    }
  })
  .transform((environment) => ({
    ...environment,
    BETTER_AUTH_URL: environment.BETTER_AUTH_URL.origin,
  }));

const migrationEnvironment = z.object({
  DIRECT_URL: postgresUrl.pipe(
    z
      .string()
      .refine(
        (value) => !new URL(value).hostname.includes("-pooler."),
        "Unpooled migration URL required",
      ),
  ),
});

function parseEnvironment<T extends z.ZodType>(
  schema: T,
  source: EnvironmentSource,
): z.output<T> {
  let result;
  try {
    result = schema.safeParse(source);
  } catch {
    // Refinements and URL parsing can throw even when using safeParse.
    // Node's URL errors retain the raw input; never propagate them or a cause.
    throw new Error("Invalid environment configuration. Values are hidden.");
  }
  if (!result.success) {
    // Never include Zod's input, database URLs, or the original error as a cause.
    const keys = [
      ...new Set(
        result.error.issues.map((issue) =>
          String(issue.path[0] ?? "configuration"),
        ),
      ),
    ];
    throw new Error(
      `Invalid environment configuration: ${keys.join(", ")}. Values are hidden.`,
    );
  }
  return result.data;
}

export function readRuntimeEnvironment(source: EnvironmentSource) {
  assertSupportedAuthEnvironment(source);
  return parseEnvironment(runtimeEnvironment, source);
}

export function readMigrationEnvironment(source: EnvironmentSource) {
  return parseEnvironment(migrationEnvironment, source);
}

export type RuntimeEnvironment = ReturnType<typeof readRuntimeEnvironment>;
