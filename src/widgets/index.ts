/**
 * Experimental widget utilities for OpenAI Apps SDK
 *
 * This module provides a unified API for creating MCP widgets that work
 * with the OpenAI Apps SDK. It abstracts away the boilerplate of registering
 * both resources and tools with proper linking and metadata.
 *
 * @experimental This API is experimental and may change in future versions
 *
 * @example
 * ```typescript
 * import { experimental_createWidget } from "mcp-handler/widgets";
 *
 * const widget = experimental_createWidget({
 *   id: "my_widget",
 *   title: "My Widget",
 *   description: "A sample widget",
 *   html: "<div>Hello World</div>",
 *   handler: async () => ({
 *     structuredContent: { message: "Hello" }
 *   })
 * });
 *
 * await widget.register(server);
 * ```
 */

export { experimental_createWidget } from "./widget-builder";
export { experimental_createWidgetResponse } from "./response-helpers";

export type {
  Widget,
  WidgetConfig,
  WidgetMetadata,
  WidgetResponse,
} from "./widget-types";
