import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { AsyncLocalStorage } from "node:async_hooks";

interface AuthContextData {
  authInfo: AuthInfo;
  requiredToolScopes?: Record<string, string[]>;
}

const authContext = new AsyncLocalStorage<AuthContextData>();

export function getAuthContext(): AuthInfo | undefined {
  return authContext.getStore()?.authInfo;
}

export function getRequiredToolScopes(): Record<string, string[]> | undefined {
  return authContext.getStore()?.requiredToolScopes;
}

export function withAuthContext<T>(authInfo: AuthInfo, requiredToolScopes: Record<string, string[]> | undefined, callback: () => T): T {
  return authContext.run({ authInfo, requiredToolScopes }, callback);
}
