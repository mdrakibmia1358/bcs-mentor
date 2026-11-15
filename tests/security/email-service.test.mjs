import assert from "node:assert/strict";
import test from "node:test";
import {
  renderVerificationEmail,
  renderPasswordResetEmail,
  validateTrustedOrigin,
  validateActionURL,
} from "../../src/lib/email/templates.ts";
import { createEmailService } from "../../src/lib/email/service.server.ts";
import { forbidNetwork } from "./helpers/offline.mjs";

const network = forbidNetwork();
const production = Object.freeze({
  trustedOrigin: "https://bcsmentor.example",
  environment: "production",
});
const token = "synthetic&secret<token>\"'";
const actionURL = `https://bcsmentor.example/api/auth/verify-email?token=${encodeURIComponent(token)}&callbackURL=%2Fdashboard`;

const address = "learner@example.test";

function fakeService(messages, overrides = {}) {
  return createEmailService({
    ...production,
    deliveryEnabled: true,
    transport: {
      async send(message) {
        messages.push(message);
      },
    },
    ...overrides,
  });
}

test("verification template has Bengali plain text and safe HTML", () => {
  const result = renderVerificationEmail(actionURL, production);
  assert.match(result.subject, /ইমেইল যাচাই/);
  assert.match(result.text, /ইমেইল যাচাই/);
  assert.ok(result.text.includes(actionURL));
  assert.match(result.html, /lang="bn"/);
  assert.match(result.html, /href="https:\/\/bcsmentor\.example/);
  assert.ok(result.html.includes("&amp;callbackURL="));
  assert.ok(!result.html.includes("<token>"));
  assert.ok(!result.html.includes("onerror="));
});

test("password-reset template is distinct and contains the action link", () => {
  const resetURL = "https://bcsmentor.example/reset-password?token=synthetic";
  const result = renderPasswordResetEmail(resetURL, production);
  assert.match(result.subject, /পাসওয়ার্ড পুনরুদ্ধার/);
  assert.ok(result.text.includes(resetURL));
  assert.match(result.html, /পাসওয়ার্ড/);
  assert.doesNotMatch(result.subject, /ইমেইল যাচাই/);
});

test("HTML escaping prevents link-based attribute and markup injection", () => {
  const maliciousURL =
    "https://bcsmentor.example/reset-password?token=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E&x=%22%3E%3Cscript%3E";
  const rendered = renderPasswordResetEmail(maliciousURL, production);
  assert.ok(rendered.text.includes(maliciousURL));
  assert.ok(rendered.html.includes("&amp;x="));
  assert.ok(!rendered.html.includes("<script>"));
  assert.ok(!rendered.html.includes("<img "));
  assert.ok(
    !rendered.html.includes(
      'href="https://bcsmentor.example/reset-password?token=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E&x=',
    ),
  );
});

test("rejects off-origin links and credentialed links without disclosing input", () => {
  const threats = [
    "https://attacker.example/reset-password?token=secret",
    "https://bcsmentor.example.attacker.example/reset-password?token=secret",
    "https://attacker.example@bcsmentor.example/reset-password?token=secret",
    "//bcsmentor.example/reset-password?token=secret",
    "javascript:alert(1)",
    "https://bcsmentor.example/reset-password#secret",
    "https://bcsmentor.example\\@attacker.example/reset-password",
    "https://bcsmentor.example/",
    "not-a-url?secret",
  ];
  for (const url of threats) {
    assert.throws(
      () => validateActionURL(url, production),
      (error) => {
        assert.equal(error.message, "Email action URL is not permitted.");
        assert.ok(!JSON.stringify(error).includes("secret"));
        return true;
      },
    );
  }
});

test("rejects remote HTTP, invalid trusted origins, and HTTP in production", () => {
  const origins = [
    { trustedOrigin: "http://bcsmentor.example", environment: "development" },
    { trustedOrigin: "http://localhost:3000", environment: "production" },
    {
      trustedOrigin: "https://bcsmentor.example/path",
      environment: "production",
    },
    {
      trustedOrigin: "https://user:pass@bcsmentor.example",
      environment: "production",
    },
    {
      trustedOrigin: "https://bcsmentor.example?x=secret",
      environment: "production",
    },
    {
      trustedOrigin: "https://bcsmentor.example#fragment",
      environment: "production",
    },
    {
      trustedOrigin: "https://bcsmentor.example\\evil",
      environment: "production",
    },
  ];
  for (const origin of origins) {
    assert.throws(
      () => validateTrustedOrigin(origin),
      (error) => {
        assert.equal(error.message, "Email origin configuration is invalid.");
        return true;
      },
    );
  }
});

test("allows only loopback HTTP in non-production", () => {
  for (const origin of [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://[::1]:3000",
  ]) {
    const policy = { trustedOrigin: origin, environment: "test" };
    const result = renderVerificationEmail(
      `${origin}/api/auth/verify-email?token=fake`,
      policy,
    );
    assert.match(result.text, /verify-email/);
  }
});

test("a disabled service fails closed without contacting the transport", async () => {
  const messages = [];
  const disabled = fakeService(messages, { deliveryEnabled: false });
  await assert.rejects(
    disabled.sendVerification({ to: address, actionUrl: actionURL }),
    /Email delivery is unavailable/,
  );
  const noTransport = createEmailService(production);
  await assert.rejects(
    noTransport.sendPasswordReset({ to: address, actionUrl: actionURL }),
    /Email delivery is unavailable/,
  );
  assert.equal(messages.length, 0);
});

test("an injected mock transport receives verification and reset messages", async () => {
  const messages = [];
  const service = fakeService(messages);
  await service.sendVerification({ to: address, actionUrl: actionURL });
  await service.sendPasswordReset({
    to: address,
    actionUrl: "https://bcsmentor.example/reset-password?token=fake",
  });
  assert.equal(messages.length, 2);
  assert.equal(messages[0].to, address);
  assert.match(messages[0].subject, /যাচাই/);
  assert.match(messages[1].subject, /পাসওয়ার্ড/);
});

test("invalid recipient and header injection are rejected", async () => {
  const messages = [];
  const service = fakeService(messages);
  for (const to of [
    "",
    "not-an-email",
    "a@b.test\r\nBcc:leak@attacker.example",
    "@example.com",
    "a@b",
    "a".repeat(245) + "@example.test",
  ]) {
    await assert.rejects(
      service.sendVerification({ to, actionUrl: actionURL }),
      /Email recipient is invalid/,
    );
  }
  assert.equal(messages.length, 0);
});

test("provider errors hide addresses, tokens and provider response diagnostics", async () => {
  const secret = "synthetic-password-token-never-expose";
  const service = fakeService([], {
    transport: {
      async send() {
        throw new Error(`SMTP 550 ${address} ${secret} ${actionURL}`);
      },
    },
  });
  const calls = [];
  const original = {
    log: console.log,
    error: console.error,
    warn: console.warn,
  };
  try {
    for (const key of ["log", "error", "warn"]) {
      console[key] = (...args) => calls.push(args.join(" "));
    }
    await assert.rejects(
      service.sendVerification({ to: address, actionUrl: actionURL }),
      (error) => {
        assert.equal(error.message, "Email delivery failed.");
        assert.ok(!String(error).includes(secret));
        assert.ok(!String(error).includes(address));
        assert.ok(!String(error).includes(token));
        return true;
      },
    );
  } finally {
    Object.assign(console, original);
  }
  assert.deepEqual(calls, []);
});

test.after(() => {
  assert.equal(network.attempts, 0);
  network.restore();
});
