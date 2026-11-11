import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import {
  checkNames,
  requireOptIn,
  requireLocalContext,
  root,
} from "../tests/integration/bootstrap.mjs";

import {
  createChildEnvironment,
  authorizeSpawnedChild,
} from "../tests/integration/launch.mjs";

try {
  // This gate precedes .env loading, client construction, or network access.
  requireOptIn(process.env);
  requireLocalContext();
  const runId = randomUUID();
  const environment = createChildEnvironment(runId);
  // This locally generated correlation ID is not a credential or session token.
  process.stdout.write(`Synthetic run ID: ${runId}\n`);
  const child = spawn(
    process.execPath,
    [
      "--experimental-strip-types",
      "--conditions=react-server",
      "--test",
      "--test-concurrency=1",
      "--experimental-test-isolation=none",
      "--test-reporter=tap",
      fileURLToPath(
        new URL("../tests/integration/postgres.test.mjs", import.meta.url),
      ),
    ],
    { cwd: root, env: environment, stdio: ["ignore", "pipe", "pipe", "pipe"] },
  );

  const authorization = authorizeSpawnedChild(child, runId);

  let interrupted = false;
  const interrupt = () => {
    interrupted = true;
    child.kill("SIGTERM");
  };
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  const passed = new Set();
  let failed = false;
  // Discard dependency diagnostics, stacks, assertion values, and raw stderr.
  // Publish only fixed test names: a driver error can never become CLI output.
  child.stderr.resume();
  const lines = createInterface({ input: child.stdout });
  lines.on("line", (line) => {
    const match = /^\s*(ok|not ok) \d+ - (.+)$/.exec(line);
    if (!match || !checkNames.includes(match[2])) return;
    if (match[1] === "ok") passed.add(match[2]);
    else failed = true;
    process.stdout.write(
      `${match[1] === "ok" ? "PASS" : "FAIL"} ${match[2]}\n`,
    );
  });
  const code = await new Promise((resolve) => {
    child.once("error", () => resolve(1));
    child.once("close", (status) => resolve(status ?? 1));
  });
  process.removeListener("SIGINT", interrupt);
  process.removeListener("SIGTERM", interrupt);
  if (
    !(await authorization) ||
    code !== 0 ||
    failed ||
    interrupted ||
    passed.size !== checkNames.length
  ) {
    process.stderr.write(
      "Integration run failed or was interrupted. Diagnostics withheld; cleanup may require independent review.\n",
    );
    process.exitCode = 1;
  } else {
    process.stdout.write(
      "All integration checks and current-run cleanup passed.\n",
    );
  }
} catch {
  process.stderr.write(
    "Integration runner refused execution. Review opt-in, local Git branch, private .env, and reviewed integration sources. Values are hidden.\n",
  );
  process.exitCode = 1;
}
