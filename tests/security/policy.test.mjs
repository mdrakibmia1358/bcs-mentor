import assert from "node:assert/strict";
import { inspect } from "node:util";
import test, { after, before } from "node:test";
import { origin, foreignOrigin, secret } from "./helpers/fixtures.mjs";
import { forbidNetwork } from "./helpers/offline.mjs";

// Retains the audited memory-adapter context/API/HTTP groups. These are local
// Request/Response objects, not a mounted route, DB integration, or email flow.
const network = forbidNetwork();
const changedKeys = [
  ...new Set([
    ...Object.keys(process.env).filter((key) => key.startsWith("BETTER_AUTH_")),
    "AUTH_SECRET",
    "NODE_ENV",
  ]),
];
const savedEnvironment = new Map(
  changedKeys.map((key) => [key, process.env[key]]),
);
// This isolated test worker deliberately uses a synthetic environment. Production
// never deletes override variables: real server rejection is tested separately.
for (const key of changedKeys) delete process.env[key];
process.env.NODE_ENV = "test";

const logs = [];
const consoleMethods = ["error", "warn", "log", "info", "debug"];
const savedConsole = new Map(consoleMethods.map((key) => [key, console[key]]));
for (const key of consoleMethods) {
  console[key] = (...args) =>
    logs.push(args.map((value) => inspect(value)).join(" "));
}

let auth;
let database;
let calls;
let context;
const password = "SyntheticPassword-123456";
const emails = ["existing@example.test", "missing@example.test"];

before(async () => {
  // Import after fixture isolation, including Better Auth's NODE_ENV snapshot.
  const { createGuardedMemoryAuth } = await import("./helpers/memory-auth.mjs");
  ({ auth, database, calls } = createGuardedMemoryAuth());
  context = await auth.$context;
});

after(() => {
  for (const [key, value] of savedConsole) console[key] = value;
  for (const [key, value] of savedEnvironment) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  const attempts = network.attempts;
  network.restore();
  assert.equal(attempts, 0);
  const output = logs.join("\n");
  for (const value of [secret, password, "fake_password"]) {
    assert.ok(
      !output.includes(value),
      "Auth logs retained synthetic credentials.",
    );
  }
});

test("actual context requires email verification and disables public signup", () => {
  assert.equal(context.options.emailAndPassword.requireEmailVerification, true);
  assert.equal(context.options.emailAndPassword.disableSignUp, true);
  assert.equal(context.options.emailAndPassword.autoSignIn, false);
  assert.equal(
    context.options.emailAndPassword.revokeSessionsOnPasswordReset,
    true,
  );
  assert.equal(
    context.options.emailAndPassword.resetPasswordTokenExpiresIn,
    1800,
  );
  assert.equal(context.options.emailAndPassword.minPasswordLength, 12);
  assert.equal(context.options.emailAndPassword.maxPasswordLength, 128);
});

test("explicit telemetry opt-out publishes nothing even with a test tracking sink", async () => {
  const { createTelemetry } = await import("@better-auth/telemetry");
  const events = [];
  assert.equal(context.options.telemetry.enabled, false);
  const tracker = await createTelemetry(context.options, {
    skipTestCheck: true,
    customTrack: async (event) => {
      events.push(event);
    },
  });
  await tracker.publish({ type: "synthetic-security-test", payload: {} });
  assert.deepEqual(events, []);
  assert.equal(network.attempts, 0);
});

test("actual context uses secure HttpOnly SameSite=Lax session cookies", () => {
  const cookie = context.authCookies.sessionToken;
  assert.ok(cookie.name.startsWith("__Secure-"));
  assert.equal(cookie.attributes.secure, true);
  assert.equal(cookie.attributes.httpOnly, true);
  assert.equal(cookie.attributes.sameSite, "lax");
  assert.equal(cookie.attributes.domain, undefined);
  assert.equal(context.options.advanced.crossSubDomainCookies.enabled, false);
  assert.equal(context.options.advanced.trustedProxyHeaders, false);
});

test("actual context trusts only the exact approved origin and enforces CSRF/origin checks", () => {
  assert.deepEqual([...new Set(context.trustedOrigins)], [origin]);
  assert.equal(context.isTrustedOrigin(origin), true);
  assert.equal(context.isTrustedOrigin(foreignOrigin), false);
  assert.equal(context.isTrustedOrigin("https://sub.app.example.test"), false);
  assert.equal(
    context.isTrustedOrigin("/dashboard", { allowRelativePaths: true }),
    true,
  );
  assert.equal(context.skipCSRFCheck, false);
  assert.equal(context.skipOriginCheck, false);
});

test("actual context keeps database rate limiting and unchanged session policy", () => {
  assert.equal(context.rateLimit.enabled, true);
  assert.equal(context.rateLimit.storage, "database");
  assert.equal(context.options.session.cookieCache.enabled, false);
  assert.equal(context.options.session.disableSessionRefresh, true);
  assert.equal(context.options.session.expiresIn, 604800);
});

function accountAccessCount() {
  return calls.filter((call) => call.model && call.model !== "rateLimit")
    .length;
}

async function apiResponse(method, body) {
  try {
    return await auth.api[method]({ body, asResponse: true });
  } catch (error) {
    if (Number.isInteger(error.statusCode)) {
      return new Response(JSON.stringify(error.body), {
        status: error.statusCode,
      });
    }
    throw new Error("Unexpected direct auth API failure; details withheld.");
  }
}

test("signup is uniformly disabled before lookup for existing and missing addresses", async () => {
  const responses = [];
  const before = accountAccessCount();
  for (const email of emails) {
    const response = await apiResponse("signUpEmail", {
      name: "Synthetic",
      email,
      password,
    });
    responses.push([response.status, await response.text()]);
  }
  assert.equal(responses[0][0], 400);
  assert.deepEqual(responses[0], responses[1]);
  assert.match(
    responses[0][1],
    /EMAIL_PASSWORD_SIGN_UP_DISABLED|SIGN_UP_IS_DISABLED|sign.?up is disabled/i,
  );
  assert.equal(accountAccessCount(), before);
});

for (const method of ["requestPasswordReset", "sendVerificationEmail"]) {
  test(`${method} fails closed uniformly before account lookup`, async () => {
    const responses = [];
    const before = accountAccessCount();
    for (const email of emails) {
      const response = await apiResponse(method, { email });
      responses.push([response.status, await response.text()]);
    }
    assert.equal(responses[0][0], 503);
    assert.deepEqual(responses[0], responses[1]);
    assert.equal(accountAccessCount(), before);
  });
}

function request(path, body, headers = {}) {
  return auth.handler(
    new Request(`${origin}/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin, ...headers },
      body: JSON.stringify(body),
    }),
  );
}

test("off-origin signup callback receives 403 before account access", async () => {
  const response = await request(
    "/sign-up/email",
    {
      name: "Synthetic",
      email: emails[1],
      password,
      callbackURL: `${foreignOrigin}/steal`,
    },
    { "x-forwarded-for": "192.0.2.10" },
  );
  assert.equal(response.status, 403);
  assert.match(await response.text(), /INVALID_CALLBACK_URL/);
  assert.equal(accountAccessCount(), 0);
});

test("hostile origin with a cookie receives 403 before account access", async () => {
  const response = await request(
    "/sign-in/email",
    {
      email: emails[1],
      password,
    },
    {
      origin: foreignOrigin,
      cookie: "synthetic=1",
      "x-forwarded-for": "192.0.2.11",
    },
  );
  assert.equal(response.status, 403);
  assert.match(await response.text(), /INVALID_ORIGIN/);
  assert.equal(accountAccessCount(), 0);
});

test("reset callback GET rejects foreign URL before verification access", async () => {
  const callbackURL = encodeURIComponent(`${foreignOrigin}/steal`);
  const response = await auth.handler(
    new Request(
      `${origin}/api/auth/reset-password/synthetic-token?callbackURL=${callbackURL}`,
      { headers: { "x-forwarded-for": "192.0.2.12" } },
    ),
  );
  assert.equal(response.status, 403);
  assert.match(await response.text(), /INVALID_CALLBACK_URL/);
  assert.equal(accountAccessCount(), 0);
});

test("HTTP signup uses guarded memory RateLimit rows and fourth request is 429", async () => {
  const statuses = [];
  for (let count = 0; count < 4; count += 1) {
    const response = await request(
      "/sign-up/email",
      {
        name: "Synthetic",
        email: emails[1],
        password,
      },
      { "x-forwarded-for": "192.0.2.13" },
    );
    statuses.push(response.status);
  }
  assert.deepEqual(statuses, [400, 400, 400, 429]);
  assert.ok(calls.some((call) => call.model === "rateLimit"));
  assert.ok(database.rateLimit.length > 0);
  assert.equal(accountAccessCount(), 0);
});
