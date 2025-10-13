import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z, ZodRawShape } from "zod";
import type { Widget, WidgetConfig, WidgetResponse } from "./widget-types";
import {
  mergeMetadata,
  generateToolMetadata,
  generateResourceMetadata,
} from "./metadata";

/**
 * Internal widget implementation
 */
class WidgetImpl<
  TInputSchema extends ZodRawShape = ZodRawShape,
  TOutput = unknown
> implements Widget<TInputSchema, TOutput>
{
  constructor(public config: WidgetConfig<TInputSchema, TOutput>) {}

  async register(server: McpServer): Promise<void> {
    const uri = this.config.uri || `ui://widget/${this.config.id}.html`;
    const metadata = mergeMetadata(
      this.config.metadata,
      this.config.description
    );

    // Resolve HTML content
    const html =
      typeof this.config.html === "function"
        ? await this.config.html()
        : this.config.html;

    // Wrap HTML if it doesn't start with <html>
    const wrappedHtml = html.trim().startsWith("<html>")
      ? html
      : `<html>${html}</html>`;

    // Register the resource (widget template)
    server.registerResource(
      this.config.id,
      uri,
      {
        title: this.config.title,
        description: this.config.description,
        mimeType: "text/html+skybridge",
        _meta: generateResourceMetadata(metadata),
      },
      async (resourceUri) => ({
        contents: [
          {
            uri: resourceUri.href,
            mimeType: "text/html+skybridge",
            text: wrappedHtml,
            _meta: generateResourceMetadata(metadata),
          },
        ],
      })
    );

    // Register the tool
    // Note: Using 'as any' casts because the MCP SDK types don't perfectly align
    // with OpenAI Apps SDK extensions (_meta fields). Runtime behavior is correct.
    server.registerTool(
      this.config.id,
      {
        title: this.config.title,
        description: this.config.description,
        inputSchema: this.config.inputSchema || ({} as TInputSchema),
        _meta: generateToolMetadata(uri, metadata),
      } as any,
      (async (input: any) => {
        const result = await this.config.handler(input);
        return {
          content: result.content || [],
          structuredContent: result.structuredContent,
          _meta: {
            ...result._meta,
            ...generateToolMetadata(uri, metadata),
          },
        };
      }) as any
    );
  }

  withToolCallsEnabled(): Widget<TInputSchema, TOutput> {
    return new WidgetImpl({
      ...this.config,
      metadata: {
        ...this.config.metadata,
        widgetAccessible: true,
      },
    });
  }

  withBorder(): Widget<TInputSchema, TOutput> {
    return new WidgetImpl({
      ...this.config,
      metadata: {
        ...this.config.metadata,
        prefersBorder: true,
      },
    });
  }

  withStatusText(
    invoking: string,
    invoked: string
  ): Widget<TInputSchema, TOutput> {
    return new WidgetImpl({
      ...this.config,
      metadata: {
        ...this.config.metadata,
        invoking,
        invoked,
      },
    });
  }

  withInputSchema<T extends ZodRawShape>(schema: T): Widget<T, TOutput> {
    return new WidgetImpl({
      ...this.config,
      inputSchema: schema,
    } as any);
  }

  withHandler<T>(
    handler: (
      input: z.infer<z.ZodObject<TInputSchema>>
    ) => Promise<WidgetResponse<T>> | WidgetResponse<T>
  ): Widget<TInputSchema, T> {
    return new WidgetImpl({
      ...this.config,
      handler,
    } as any);
  }

  withCSP(
    connectDomains: string[],
    resourceDomains: string[]
  ): Widget<TInputSchema, TOutput> {
    return new WidgetImpl({
      ...this.config,
      metadata: {
        ...this.config.metadata,
        widgetCSP: {
          connect_domains: connectDomains,
          resource_domains: resourceDomains,
        },
      },
    });
  }

  withDomain(domain: string): Widget<TInputSchema, TOutput> {
    return new WidgetImpl({
      ...this.config,
      metadata: {
        ...this.config.metadata,
        widgetDomain: domain,
      },
    });
  }
}

/**
 * Create a new widget that can be registered with an MCP server.
 * This function provides a unified API for creating both the resource and tool
 * needed for OpenAI Apps SDK widgets.
 *
 * @experimental This API is experimental and may change in future versions
 *
 * @example
 * ```typescript
 * const myWidget = experimental_createWidget({
 *   id: "show_content",
 *   title: "Show Content",
 *   description: "Displays the homepage content",
 *   html: "<div>Hello World</div>",
 *   inputSchema: { name: z.string() },
 *   handler: async ({ name }) => ({
 *     structuredContent: { name },
 *     content: [{ type: "text", text: `Hello ${name}` }],
 *   }),
 * });
 *
 * await myWidget.register(server);
 * ```
 */
export function experimental_createWidget<
  TInputSchema extends ZodRawShape = ZodRawShape,
  TOutput = unknown
>(
  config: WidgetConfig<TInputSchema, TOutput>
): Widget<TInputSchema, TOutput> {
  return new WidgetImpl(config);
}
