import { randomUUID } from "node:crypto";
import { Socket } from "node:net";
import { requireOptIn, requireSafe } from "./bootstrap.mjs";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// No inherited configuration, credentials, runtime flags, or temp/search paths.
export function createChildEnvironment(runId) {
  requireSafe(uuid.test(runId));
  return {
    ENABLE_NEON_INTEGRATION_TESTS: "1",
    BCS_INTEGRATION_CHILD: runId,
    NODE_ENV: "test",
  };
}

export function validateChildEnvironment(environment) {
  requireOptIn(environment);
  requireSafe(uuid.test(environment.BCS_INTEGRATION_CHILD ?? ""));
  const expected = createChildEnvironment(environment.BCS_INTEGRATION_CHILD);
  requireSafe(Object.keys(environment).length === Object.keys(expected).length);
  for (const [key, value] of Object.entries(expected)) {
    requireSafe(environment[key] === value);
  }
}

function readMessage(stream) {
  return new Promise((resolve, reject) => {
    let text = "";
    const timeout = setTimeout(fail, 3_000);
    function cleanup() {
      clearTimeout(timeout);
      stream.off("data", receive);
      stream.off("error", fail);
      stream.off("end", fail);
      stream.off("close", fail);
    }
    function fail() {
      cleanup();
      reject(new Error("Integration launch authorization failed."));
    }
    function receive(chunk) {
      text += chunk.toString("utf8");
      if (text.length > 1_024) return fail();
      if (!text.endsWith("\n")) return;
      try {
        const message = JSON.parse(text);
        cleanup();
        resolve(message);
      } catch {
        fail();
      }
    }
    stream.on("data", receive);
    stream.on("error", fail);
    stream.on("end", fail);
    stream.on("close", fail);
  });
}

// The inherited, private duplex pipe is the launch capability, not the UUID.
// No credential or configuration is sent through this channel.
export async function authorizeSpawnedChild(child, runId) {
  const channel = child.stdio[3];
  channel.on("error", () => {});
  try {
    const request = await readMessage(channel);
    requireSafe(
      request?.kind === "integration-launch" && uuid.test(request.nonce),
    );
    channel.end(
      JSON.stringify({ nonce: request.nonce, runId, parentPid: process.pid }) +
        "\n",
    );
    return true;
  } catch {
    channel.destroy();
    return false;
  }
}

export async function authorizeIntegrationChild() {
  if (
    process.env.ENABLE_NEON_INTEGRATION_TESTS === undefined &&
    process.env.BCS_INTEGRATION_CHILD === undefined
  )
    return false;
  let channel;
  try {
    // Check isolation independently of the pipe: even a custom parent cannot
    // authorize a child with inherited credentials, TLS bypasses, or Node flags.
    validateChildEnvironment(process.env);
    channel = new Socket({ fd: 3, readable: true, writable: true });
    channel.on("error", () => {});
    const nonce = randomUUID();
    const response = readMessage(channel);
    channel.write(JSON.stringify({ kind: "integration-launch", nonce }) + "\n");
    const approval = await response;
    requireSafe(
      approval?.nonce === nonce &&
        approval.runId === process.env.BCS_INTEGRATION_CHILD &&
        approval.parentPid === process.ppid,
    );
    return true;
  } catch {
    throw new Error(
      "Integration requires the isolated manual runner. Values are hidden.",
    );
  } finally {
    channel?.destroy();
  }
}
