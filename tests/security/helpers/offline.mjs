import { Server, Socket } from "node:net";

// A failed test must never fall through to a real service or open a listener.
export function forbidNetwork() {
  let attempts = 0;
  const originalConnect = Socket.prototype.connect;
  const originalListen = Server.prototype.listen;
  const originalFetch = globalThis.fetch;
  function blocked() {
    attempts += 1;
    throw new Error("Network and listeners are forbidden in offline tests.");
  }
  Socket.prototype.connect = blocked;
  Server.prototype.listen = blocked;
  globalThis.fetch = blocked;
  return {
    get attempts() {
      return attempts;
    },
    restore() {
      Socket.prototype.connect = originalConnect;
      Server.prototype.listen = originalListen;
      globalThis.fetch = originalFetch;
    },
  };
}
