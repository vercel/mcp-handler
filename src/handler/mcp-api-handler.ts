import {
  createMcpHandler as createSdkMcpHandler,
  McpServer,
} from "@modelcontextprotocol/server";
import type {
  McpEvent,
  McpRequestEvent,
  McpErrorEvent,
} from "../lib/log-helper";
import { createEvent } from "../lib/log-helper";
import type { ServerOptions } from ".";

/**
 * Configuration for the MCP handler.
 */
export type Config = {
  /**
   * @deprecated Ignored in 2.x. Redis is no longer used.
   */
  redisUrl?: string;
  /**
   * @deprecated Ignored in 2.x. Mount the handler at the desired route in
   * your framework instead.
   */
  streamableHttpEndpoint?: string;
  /**
   * @deprecated Ignored in 2.x. The legacy HTTP+SSE transport was removed.
   */
  sseEndpoint?: string;
  /**
   * @deprecated Ignored in 2.x. The legacy HTTP+SSE transport was removed.
   */
  sseMessageEndpoint?: string;
  /**
   * @deprecated Ignored in 2.x. Requests are served per invocation.
   */
  maxDuration?: number;
  /**
   * If true, enables console logging.
   * @default false
   */
  verboseLogs?: boolean;
  /**
   * @deprecated Ignored in 2.x. Mount the handler at the desired route in
   * your framework instead.
   */
  basePath?: string;
  /**
   * Callback function that receives MCP events.
   * This can be used to track analytics, debug issues, or implement custom behaviors.
   */
  onEvent?: (event: McpEvent) => void;

  /**
   * @deprecated Ignored in 2.x. The legacy HTTP+SSE transport was removed.
   */
  disableSse?: boolean;

  /**
   * @deprecated Ignored in 2.x. Sessions no longer exist.
   */
  sessionIdGenerator?: undefined;
};

export function initializeMcpApiHandler(
  initializeServer:
    | ((server: McpServer) => Promise<void>)
    | ((server: McpServer) => void),
  serverOptions: ServerOptions = {},
  config: Config = {},
): (req: Request) => Promise<Response> {
  const { verboseLogs, onEvent } = config;

  const {
    serverInfo = {
      name: "mcp-typescript server on vercel",
      version: "0.1.0",
    },
    ...mcpServerOptions
  } = serverOptions;

  const emitError = (error: Error) => {
    if (verboseLogs) {
      console.error("MCP handler error:", error);
    }
    onEvent?.(
      createEvent<McpErrorEvent>({
        type: "ERROR",
        error,
        source: "request",
        severity: "error",
      }),
    );
  };

  // The SDK handler serves the 2026-07-28 protocol (stateless, per-request
  // envelope, server/discover) and falls back to stateless serving for
  // 2025-era Streamable HTTP clients. A fresh McpServer is constructed per
  // request via the factory.
  const sdkHandler = createSdkMcpHandler(
    async () => {
      const server = new McpServer(serverInfo, mcpServerOptions);
      await initializeServer(server);
      return server;
    },
    {
      legacy: "stateless",
      onerror: emitError,
    },
  );

  return async function mcpApiHandler(req: Request): Promise<Response> {
    let method: string | undefined;
    let parsedBody: unknown;
    const started = Date.now();

    if (
      req.method === "POST" &&
      (req.headers.get("content-type") || "").includes("application/json")
    ) {
      try {
        parsedBody = await req.clone().json();
        if (
          typeof parsedBody === "object" &&
          parsedBody !== null &&
          "method" in parsedBody
        ) {
          method = String((parsedBody as { method: unknown }).method);
          onEvent?.(
            createEvent<McpRequestEvent>({
              type: "REQUEST_RECEIVED",
              method,
              parameters: parsedBody,
              status: "success",
            }),
          );
        }
      } catch {
        // Malformed JSON is rejected by the SDK handler below.
      }
    }

    try {
      const response = await sdkHandler.fetch(req, {
        authInfo: req.auth,
        parsedBody,
      });

      if (method) {
        onEvent?.(
          createEvent<McpRequestEvent>({
            type: "REQUEST_COMPLETED",
            method,
            duration: Date.now() - started,
            status: response.ok ? "success" : "error",
          }),
        );
      }
      return response;
    } catch (error) {
      emitError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  };
}
