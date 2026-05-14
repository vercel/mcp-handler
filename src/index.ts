// Re-export the Next.js adapter
export { default as createMcpHandler } from "./handler";
export type { Config, InitializeMcpServer, ServerOptions } from "./handler";
export type {
  McpErrorEvent,
  McpEvent,
  McpEventType,
  McpRequestEvent,
  McpSessionEvent,
} from "./lib/log-helper";

/**
 * @deprecated Use withMcpAuth instead
 */
export { withMcpAuth as experimental_withMcpAuth } from "./auth/auth-wrapper";

export { withMcpAuth } from "./auth/auth-wrapper";

export {
  protectedResourceHandler,
  generateProtectedResourceMetadata,
  metadataCorsOptionsRequestHandler,
} from "./auth/auth-metadata";

export { getPublicOrigin, getPublicUrl } from "./lib/url";
