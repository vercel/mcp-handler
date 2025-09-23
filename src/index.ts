// Re-export the Next.js adapter
export { default as createMcpHandler } from "./handler";

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

export {
  withObservability,
  createObservabilitySpan,
  getCurrentSpan,
  addSpanAttribute,
  addSpanEvent,
  type ObservabilityConfig,
} from "./observability";
