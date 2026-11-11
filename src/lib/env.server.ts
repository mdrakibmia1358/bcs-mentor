import "server-only";

import { readRuntimeEnvironment, type RuntimeEnvironment } from "./env";

let environment: RuntimeEnvironment | undefined;

export function getRuntimeEnvironment() {
  environment ??= readRuntimeEnvironment(process.env);
  return environment;
}
