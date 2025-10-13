import type { WidgetResponse } from "./widget-types";

/**
 * Helper to create a widget response with structured content
 */
export function experimental_createWidgetResponse<T = unknown>(config: {
  /**
   * Structured data for the widget and model
   */
  structuredContent?: T;

  /**
   * Shorthand for content array with a single text entry
   * Alternative to providing `content` array directly
   */
  modelText?: string;

  /**
   * Full content array (overrides modelText if both provided)
   */
  content?: Array<{ type: "text"; text: string }>;

  /**
   * Widget-only data (not visible to the model)
   */
  widgetData?: Record<string, unknown>;
}): WidgetResponse<T> {
  const response: WidgetResponse<T> = {};

  if (config.structuredContent !== undefined) {
    response.structuredContent = config.structuredContent;
  }

  if (config.content) {
    response.content = config.content;
  } else if (config.modelText) {
    response.content = [{ type: "text", text: config.modelText }];
  }

  if (config.widgetData) {
    response._meta = config.widgetData;
  }

  return response;
}
