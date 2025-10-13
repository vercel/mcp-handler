import type { WidgetMetadata } from "./widget-types";

/**
 * Default OpenAI widget metadata
 */
export const DEFAULT_WIDGET_METADATA: Required<
  Omit<WidgetMetadata, "widgetCSP" | "widgetDomain">
> = {
  invoking: "Loading...",
  invoked: "Loaded",
  widgetAccessible: false,
  widgetDescription: "",
  prefersBorder: false,
};

/**
 * Generate OpenAI-specific tool metadata for linking to a widget resource
 */
export function generateToolMetadata(
  uri: string,
  metadata: WidgetMetadata
): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    "openai/outputTemplate": uri,
    "openai/toolInvocation/invoking": metadata.invoking,
    "openai/toolInvocation/invoked": metadata.invoked,
    "openai/widgetAccessible": metadata.widgetAccessible,
    "openai/resultCanProduceWidget": true,
  };

  return meta;
}

/**
 * Generate OpenAI-specific resource metadata for widget templates
 */
export function generateResourceMetadata(
  metadata: WidgetMetadata
): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    "openai/widgetDescription": metadata.widgetDescription,
  };

  if (metadata.prefersBorder !== undefined) {
    meta["openai/widgetPrefersBorder"] = metadata.prefersBorder;
  }

  if (metadata.widgetCSP) {
    meta["openai/widgetCSP"] = metadata.widgetCSP;
  }

  if (metadata.widgetDomain) {
    meta["openai/widgetDomain"] = metadata.widgetDomain;
  }

  return meta;
}

/**
 * Merge user-provided metadata with defaults
 */
export function mergeMetadata(
  userMetadata: WidgetMetadata | undefined,
  defaultDescription: string
): WidgetMetadata {
  return {
    ...DEFAULT_WIDGET_METADATA,
    widgetDescription: defaultDescription,
    ...userMetadata,
  };
}
