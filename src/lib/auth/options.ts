import type { BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";

function emailUnavailable(): never {
  // Do not log addresses, tokens, links, or silently pretend delivery succeeded.
  throw new APIError("SERVICE_UNAVAILABLE", {
    message: "ইমেইল সেবা এখনো চালু হয়নি। পরে আবার চেষ্টা করুন।",
  });
}

// Shared by runtime configuration and the offline, pinned schema generator.
// This module contains policy only; credentials and database access stay server-only.
export const authOptions = {
  appName: "BCS Mentor",
  basePath: "/api/auth",
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: true,
    autoSignIn: false,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 30 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async () => emailUnavailable(),
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: false,
    expiresIn: 60 * 60,
    sendVerificationEmail: async () => emailUnavailable(),
  },
  session: {
    expiresIn: 7 * 24 * 60 * 60,
    disableSessionRefresh: true,
    cookieCache: { enabled: false },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 10, max: 3 },
      "/sign-up/email": { window: 60, max: 3 },
      "/request-password-reset": { window: 60, max: 3 },
      "/send-verification-email": { window: 60, max: 3 },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (context) => {
      // Reject uniformly before account lookup until the real sender is ready.
      // This also covers direct server API calls, which bypass HTTP rate limits.
      if (
        context.path === "/request-password-reset" ||
        context.path === "/send-verification-email"
      ) {
        emailUnavailable();
      }
    }),
  },
  account: { accountLinking: { enabled: false } },
  user: { changeEmail: { enabled: false }, deleteUser: { enabled: false } },
  advanced: {
    disableOriginCheck: false,
    disableCSRFCheck: false,
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    crossSubDomainCookies: { enabled: false },
    trustedProxyHeaders: false,
  },
  logger: {
    level: "error",
    log: () =>
      console.error(
        "Authentication request failed; sensitive details omitted.",
      ),
  },
  telemetry: { enabled: false },
} satisfies BetterAuthOptions;
