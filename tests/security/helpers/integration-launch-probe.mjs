// Offline subprocess boundary: never load credentials or any live-test dependency.
import fs from "node:fs";
import { registerHooks, syncBuiltinESMExports } from "node:module";
import { forbidNetwork } from "./offline.mjs";

const network = forbidNetwork();
let protectedAttempts = 0;
function deny() {
  protectedAttempts += 1;
  throw new Error(
    "Protected resource is forbidden in the offline launch probe.",
  );
}
for (const method of ["lstatSync", "openSync", "readFileSync"]) {
  const original = fs[method];
  fs[method] = function (path, ...args) {
    if (String(path).endsWith("/.env")) return deny();
    return original.call(this, path, ...args);
  };
}
syncBuiltinESMExports();
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      /(?:guards\.mjs|db\.server|env\.server|env\.ts|server-resolver|generated\/prisma)/.test(
        specifier,
      ) ||
      specifier === "dotenv" ||
      specifier.startsWith("@prisma/")
    )
      return deny();
    return nextResolve(specifier, context);
  },
});
process.on("exit", () => {
  if (network.attempts === 0 && protectedAttempts === 0) {
    process.stdout.write("OFFLINE_BOUNDARY_PASSED\n");
  } else {
    process.exitCode = 1;
  }
});

// Exercise just the real handshake, never the live suite, for positive controls.
if (process.argv[2] === "authorize-only") {
  try {
    const { authorizeIntegrationChild } =
      await import("../../integration/launch.mjs");
    if (await authorizeIntegrationChild())
      process.stdout.write("LAUNCH_AUTHORIZED\n");
    else process.exitCode = 1;
  } catch {
    process.exitCode = 1;
  }
}
