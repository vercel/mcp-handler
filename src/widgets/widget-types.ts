import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z, ZodRawShape } from "zod";

/**
 * OpenAI-specific metadata for widget configuration
 */
export interface WidgetMetadata {
  /**
   * Text shown while the tool is being invoked
   * @example "Loading content..."
   */
  invoking?: string;

  /**
   * Text shown after the tool has been invoked
   * @example "Content loaded"
   */
  invoked?: string;

  /**
   * Whether the widget can initiate tool calls back to the server
   * @default false
   */
  widgetAccessible?: boolean;

  /**
   * Description shown to the model when the widget is rendered
   * If not provided, defaults to the widget description
   */
  widgetDescription?: string;

  /**
   * Whether the widget should be rendered with a border (card layout)
   * @default false
   */
  prefersBorder?: boolean;

  /**
   * Content Security Policy configuration for the widget
   */
  widgetCSP?: {
    connect_domains: string[];
    resource_domains: string[];
  };

  /**
   * Custom subdomain for the widget
   * @example "chatgpt.com" becomes "chatgpt-com.web-sandbox.oaiusercontent.com"
   */
  widgetDomain?: string;
}

/**
 * Tool response with structured content for widgets
 */
export interface WidgetResponse<T = unknown> {
  /**
   * Structured data that hydrates the widget and is visible to the model
   */
  structuredContent?: T;

  /**
   * Free-form text content visible to the model (Markdown or plain text)
   */
  content?: Array<{ type: "text"; text: string }>;

  /**
   * Arbitrary data passed only to the widget, not visible to the model
   */
  _meta?: Record<string, unknown>;
}

/**
 * Configuration for creating a widget
 */
export interface WidgetConfig<
  TInputSchema extends ZodRawShape = ZodRawShape,
  TOutput = unknown
> {
  /**
   * Unique identifier for the widget/tool
   */
  id: string;

  /**
   * Human-friendly title for the tool
   */
  title: string;

  /**
   * Description of what the tool does (shown to the model)
   */
  description: string;

  /**
   * HTML content for the widget
   * Can be a string or a function that returns a promise
   */
  html: string | (() => Promise<string>) | (() => string);

  /**
   * Resource URI for the widget template
   * If not provided, auto-generated as `ui://widget/{id}.html`
   */
  uri?: string;

  /**
   * OpenAI-specific widget metadata
   */
  metadata?: WidgetMetadata;

  /**
   * Zod schema for tool input validation (object of Zod schemas)
   */
  inputSchema?: TInputSchema;

  /**
   * Tool handler function that returns widget response
   */
  handler: (
    input: z.infer<z.ZodObject<TInputSchema>>
  ) => Promise<WidgetResponse<TOutput>> | WidgetResponse<TOutput>;
}

/**
 * Widget instance that can be registered with an MCP server
 */
export interface Widget<
  TInputSchema extends ZodRawShape = ZodRawShape,
  TOutput = unknown
> {
  /**
   * Widget configuration
   */
  config: WidgetConfig<TInputSchema, TOutput>;

  /**
   * Register this widget with an MCP server
   * Automatically registers both the resource and tool
   */
  register(server: McpServer): Promise<void>;

  /**
   * Builder method: Enable tool calls from the widget
   */
  withToolCallsEnabled(): Widget<TInputSchema, TOutput>;

  /**
   * Builder method: Enable border rendering (card layout)
   */
  withBorder(): Widget<TInputSchema, TOutput>;

  /**
   * Builder method: Set status text for tool invocation
   */
  withStatusText(
    invoking: string,
    invoked: string
  ): Widget<TInputSchema, TOutput>;

  /**
   * Builder method: Set input schema
   */
  withInputSchema<T extends ZodRawShape>(
    schema: T
  ): Widget<T, TOutput>;

  /**
   * Builder method: Set handler function
   */
  withHandler<T>(
    handler: (
      input: z.infer<z.ZodObject<TInputSchema>>
    ) => Promise<WidgetResponse<T>> | WidgetResponse<T>
  ): Widget<TInputSchema, T>;

  /**
   * Builder method: Set CSP configuration
   */
  withCSP(
    connectDomains: string[],
    resourceDomains: string[]
  ): Widget<TInputSchema, TOutput>;

  /**
   * Builder method: Set custom widget domain
   */
  withDomain(domain: string): Widget<TInputSchema, TOutput>;
}
