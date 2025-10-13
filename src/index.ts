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

// Experimental widget utilities for OpenAI Apps SDK
export {
  experimental_createWidget,
  experimental_createWidgetResponse,
} from "./widgets";

export type {
  Widget,
  WidgetConfig,
  WidgetMetadata,
  WidgetResponse,
} from "./widgets";
