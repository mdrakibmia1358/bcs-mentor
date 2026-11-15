import "server-only";

import {
  renderPasswordResetEmail,
  renderVerificationEmail,
  validateTrustedOrigin,
} from "./templates.ts";
import type {
  EmailAction,
  EmailMessage,
  EmailServiceOptions,
} from "./types.ts";

function unavailable(): never {
  throw new Error("Email delivery is unavailable.");
}

function hasHeaderControls(value: string): boolean {
  for (const character of value) {
    const point = character.codePointAt(0);
    if (point !== undefined && (point < 0x20 || point === 0x7f)) return true;
  }
  return false;
}

function validateRecipient(to: string): void {
  // Reject header injection and obviously malformed recipients. Better Auth
  // remains responsible for registration and full address normalization.
  if (
    typeof to !== "string" ||
    to.length > 254 ||
    hasHeaderControls(to) ||
    !/^[^\s@<>\\]+@[^\s@<>\\]+\.[^\s@<>\\]+$/u.test(to)
  ) {
    throw new Error("Email recipient is invalid.");
  }
}

export function createEmailService(options: EmailServiceOptions) {
  // Fail at construction for invalid origin configuration, even when disabled.
  validateTrustedOrigin(options);
  const policy = {
    trustedOrigin: options.trustedOrigin,
    environment: options.environment,
  } as const;

  async function send(
    input: EmailAction,
    purpose: "verification" | "password-reset",
  ) {
    // No production transport or callback is registered by this foundation.
    if (!options.deliveryEnabled || !options.transport) unavailable();
    validateRecipient(input.to);
    const rendered =
      purpose === "verification"
        ? renderVerificationEmail(input.actionUrl, policy)
        : renderPasswordResetEmail(input.actionUrl, policy);

    const message: EmailMessage = { to: input.to, ...rendered };
    try {
      await options.transport.send(message);
    } catch {
      // Never expose provider response, address, action URL or token.
      throw new Error("Email delivery failed.");
    }
  }

  return Object.freeze({
    sendVerification: (input: EmailAction) => send(input, "verification"),
    sendPasswordReset: (input: EmailAction) => send(input, "password-reset"),
  });
}
