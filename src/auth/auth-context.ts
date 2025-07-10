import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { AsyncLocalStorage } from "node:async_hooks";

const authContext = new AsyncLocalStorage<AuthInfo>();

export function getAuthContext(): AuthInfo | undefined {
  return authContext.getStore();
}

export function withAuthContext<T>(authInfo: AuthInfo, callback: () => T): T {
  return authContext.run(authInfo, callback);
}
