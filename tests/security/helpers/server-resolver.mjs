import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

const sourceRoot = new URL("../../../src/", import.meta.url);

// Test-only support for Next/TypeScript's extensionless imports and @/ alias.
// Package resolution and server-only's react-server condition stay genuine.
registerHooks({
  resolve(specifier, context, nextResolve) {
    let candidate;
    if (specifier.startsWith("@/")) {
      candidate = new URL(specifier.slice(2), sourceRoot);
    } else if (
      specifier.startsWith(".") &&
      context.parentURL?.startsWith(sourceRoot.href)
    ) {
      candidate = new URL(specifier, context.parentURL);
    }
    if (candidate) {
      const typedFile = new URL(`${candidate.href}.ts`);
      if (existsSync(fileURLToPath(typedFile))) {
        return nextResolve(typedFile.href, context);
      }
    }
    return nextResolve(specifier, context);
  },
});
