import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { getPrisma } from "../db.server";
import { assertSupportedAuthEnvironment } from "../env";
import { getRuntimeEnvironment } from "../env.server";
import { authOptions } from "./options";

function createAuth() {
  const environment = getRuntimeEnvironment();

  return betterAuth({
    ...authOptions,
    baseURL: environment.BETTER_AUTH_URL,
    secret: environment.BETTER_AUTH_SECRET,
    trustedOrigins: [environment.BETTER_AUTH_URL],
    database: prismaAdapter(getPrisma(), {
      provider: "postgresql",
      transaction: true,
    }),
    advanced: {
      ...authOptions.advanced,
      useSecureCookies:
        environment.NODE_ENV === "production" ||
        environment.BETTER_AUTH_URL.startsWith("https:"),
    },
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

// Lazy initialization preserves public builds without credentials or DB calls.
// There is no mounted auth handler in Phase A.
export function getAuth() {
  // Check before the lazy/cached boundary too: a previously cached runtime
  // environment must not hide a subsequently defined library override.
  assertSupportedAuthEnvironment(process.env);
  auth ??= createAuth();
  return auth;
}
