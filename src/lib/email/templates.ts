import type { EmailPolicy } from "./types.ts";

type RenderedEmail = Readonly<{
  subject: string;
  text: string;
  html: string;
}>;

function invalidLink(): never {
  // Never attach URL/credentials/token or a parsing exception as cause.
  throw new Error("Email action URL is not permitted.");
}

function invalidOrigin(): never {
  throw new Error("Email origin configuration is invalid.");
}

function hasUnsafeURLCharacters(input: string): boolean {
  // URL accepts some whitespace and backslash forms after normalization.
  for (const character of input) {
    const point = character.codePointAt(0);
    if (
      point !== undefined &&
      (point <= 0x20 || point === 0x7f || character === "\\")
    ) {
      return true;
    }
  }
  return false;
}

function isLoopback(hostname: string): boolean {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
  );
}

export function validateTrustedOrigin(policy: EmailPolicy): URL {
  const { trustedOrigin, environment } = policy;
  if (
    !["production", "development", "test"].includes(environment) ||
    typeof trustedOrigin !== "string" ||
    !trustedOrigin ||
    hasUnsafeURLCharacters(trustedOrigin)
  ) {
    invalidOrigin();
  }

  let origin: URL;
  try {
    origin = new URL(trustedOrigin);
  } catch {
    return invalidOrigin();
  }

  const secure = origin.protocol === "https:";
  const permittedLocalHTTP =
    origin.protocol === "http:" &&
    environment !== "production" &&
    isLoopback(origin.hostname);

  if (
    (!secure && !permittedLocalHTTP) ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    !origin.hostname
  ) {
    invalidOrigin();
  }
  return origin;
}

export function validateActionURL(
  actionUrl: string,
  policy: EmailPolicy,
): string {
  const origin = validateTrustedOrigin(policy);
  if (
    typeof actionUrl !== "string" ||
    !actionUrl ||
    hasUnsafeURLCharacters(actionUrl)
  ) {
    invalidLink();
  }

  let action: URL;
  try {
    action = new URL(actionUrl);
  } catch {
    return invalidLink();
  }
  if (
    action.username ||
    action.password ||
    action.hash ||
    action.origin !== origin.origin ||
    action.protocol !== origin.protocol ||
    action.pathname === "/"
  ) {
    invalidLink();
  }
  // Preserve the provider-generated URL bytes; URL.href may re-encode signed tokens.
  return actionUrl;
}

function escapeHTML(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function render(
  kind: "verification" | "password-reset",
  actionUrl: string,
  policy: EmailPolicy,
): RenderedEmail {
  const safeURL = validateActionURL(actionUrl, policy);
  const isVerification = kind === "verification";
  const title = isVerification ? "ইমেইল যাচাই করুন" : "পাসওয়ার্ড পুনরুদ্ধার";
  const details = isVerification
    ? "BCS Mentor-এ আপনার ইমেইল ঠিকানা যাচাই করতে নিচের লিংক খুলুন। লিংকটি ১ ঘণ্টা পর্যন্ত কার্যকর থাকতে পারে।"
    : "BCS Mentor-এর পাসওয়ার্ড পরিবর্তন করতে নিচের লিংক খুলুন। লিংকটি ৩০ মিনিট পর্যন্ত কার্যকর থাকতে পারে।";
  const ignored = isVerification
    ? "আপনি এই যাচাইয়ের অনুরোধ না করে থাকলে ইমেইলটি উপেক্ষা করুন।"
    : "আপনি পাসওয়ার্ড পরিবর্তনের অনুরোধ না করে থাকলে ইমেইলটি উপেক্ষা করুন।";
  const safeLinkHTML = escapeHTML(safeURL);
  const safeTitle = escapeHTML(title);
  const safeDetails = escapeHTML(details);
  const safeIgnored = escapeHTML(ignored);
  return {
    subject: `BCS Mentor — ${title}`,
    text: `${title}\n\n${details}\n\n${safeURL}\n\n${ignored}\n\nএই লিংকটি অন্য কারও সঙ্গে শেয়ার করবেন না।`,
    html: [
      '<!doctype html><html lang="bn"><head><meta charset="UTF-8"></head><body>',
      '<main style="font-family:system-ui, sans-serif; line-height:1.6">',
      `<h1>${safeTitle}</h1>`,
      `<p>${safeDetails}</p>`,
      `<p><a href="${safeLinkHTML}">নিরাপদ লিংকটি খুলুন</a></p>`,
      `<p>${safeIgnored}</p>`,
      "<p>এই লিংকটি অন্য কারও সঙ্গে শেয়ার করবেন না।</p>",
      "</main></body></html>",
    ].join(""),
  };
}

export function renderVerificationEmail(
  actionUrl: string,
  policy: EmailPolicy,
): RenderedEmail {
  return render("verification", actionUrl, policy);
}

export function renderPasswordResetEmail(
  actionUrl: string,
  policy: EmailPolicy,
): RenderedEmail {
  return render("password-reset", actionUrl, policy);
}
