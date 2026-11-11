import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { authOptions } from "../../../src/lib/auth/options.ts";
import { origin, secret } from "./fixtures.mjs";

export function createGuardedMemoryAuth() {
  const database = {
    user: [
      {
        id: "synthetic-user",
        name: "Synthetic",
        email: "existing@example.test",
        emailVerified: false,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ],
    session: [],
    account: [],
    verification: [],
    rateLimit: [],
  };
  const calls = [];
  const factory = memoryAdapter(database);
  function guard(adapter) {
    return new Proxy(adapter, {
      get(target, key) {
        const value = Reflect.get(target, key);
        if (typeof value !== "function") return value;
        return (...args) => {
          const model = args[0]?.model;
          calls.push({ method: String(key), model });
          if (key === "transaction") {
            return value.call(target, (transaction) =>
              args[0](guard(transaction)),
            );
          }
          if (model && model !== "rateLimit") {
            throw new Error("Offline guard rejected account database access.");
          }
          return value.apply(target, args);
        };
      },
    });
  }
  const auth = betterAuth({
    ...authOptions,
    baseURL: origin,
    secret,
    trustedOrigins: [origin],
    database: (options) => guard(factory(options)),
    advanced: { ...authOptions.advanced, useSecureCookies: true },
  });
  return { auth, database, calls };
}
