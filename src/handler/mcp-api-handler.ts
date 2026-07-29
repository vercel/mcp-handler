import {
  createMcpHandler as createSdkMcpHandler,
  McpServer,
} from "@modelcontextprotocol/server";
import type { McpEvent, McpRequestEvent, McpErrorEvent } from "../lib/log-helper";
import { createEvent } from "../lib/log-helper";
import type { ServerOptions } from ".";

type Logger = {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
};

function createLogger(verboseLogs = false): Logger {
  return {
    log: (...args: unknown[]) => {
      if (verboseLogs) console.log(...args);
    },
    error: (...args: unknown[]) => {
      if (verboseLogs) console.error(...args);
    },
    warn: (...args: unknown[]) => {
      if (verboseLogs) console.warn(...args);
    },
    info: (...args: unknown[]) => {
      if (verboseLogs) console.info(...args);
    },
    debug: (...args: unknown[]) => {
      if (verboseLogs) console.debug(...args);
    },
  };
}

/**
 * Configuration for the MCP handler.
 */
export type Config = {
  /**
   * @deprecated Redis is no longer used. The legacy HTTP+SSE transport
   * (protocol 2024-11-05) has been removed; both the 2026-07-28 protocol and
   * 2025-era Streamable HTTP clients are served statelessly without Redis.
   */
  redisUrl?: string;
  /**
   * The endpoint to use for the streamable HTTP transport.
   * @deprecated Use `basePath` instead.
   * @default "/mcp"
   */
  streamableHttpEndpoint?: string;
  /**
   * @deprecated The legacy HTTP+SSE transport has been removed. Requests to
   * this endpoint receive `410 Gone`.
   * @default "/sse"
   */
  sseEndpoint?: string;
  /**
   * @deprecated The legacy HTTP+SSE transport has been removed. Requests to
   * this endpoint receive `410 Gone`.
   * @default "/message"
   */
  sseMessageEndpoint?: string;
  /**
   * @deprecated No longer used. Requests are served per-invocation; there is
   * no long-lived SSE session to bound.
   */
  maxDuration?: number;
  /**
   * If true, enables console logging.
   * @default false
   */
  verboseLogs?: boolean;
  /**
   * The base path to use for deriving endpoints.
   * If provided, endpoints will be derived from this path.
   * For example, if basePath is "/", that means your routing is:
   *  /app/[transport]/route.ts and then:
   * - streamableHttpEndpoint will be "/mcp"
   * - sseEndpoint will be "/sse" (removed transport, answered with 410)
   * - sseMessageEndpoint will be "/message" (removed transport, answered with 410)
   * @default ""
   */
  basePath?: string;
  /**
   * Callback function that receives MCP events.
   * This can be used to track analytics, debug issues, or implement custom behaviors.
   */
  onEvent?: (event: McpEvent) => void;

  /**
   * If true, the removed SSE endpoints respond `404 Not Found` instead of
   * `410 Gone`.
   * @default false
   */
  disableSse?: boolean;

  /**
   * sessionIdGenerator for the streamable HTTP transport
   * @deprecated Sessions no longer exist: the 2026-07-28 protocol is
   * stateless by design and 2025-era requests are served through the SDK's
   * stateless legacy fallback.
   */
  sessionIdGenerator?: undefined;
};

/**
 * Derives MCP endpoints from a base path.
 * @param basePath - The base path to derive endpoints from
 * @returns An object containing the derived endpoints
 */
function deriveEndpointsFromBasePath(basePath: string): {
  streamableHttpEndpoint: string;
  sseEndpoint: string;
  sseMessageEndpoint: string;
} {
  // Remove trailing slash if present
  const normalizedBasePath = basePath.replace(/\/$/, "");

  return {
    streamableHttpEndpoint: `${normalizedBasePath}/mcp`,
    sseEndpoint: `${normalizedBasePath}/sse`,
    sseMessageEndpoint: `${normalizedBasePath}/message`,
  };
}

/**
 * Calculates the endpoints for the MCP handler.
 * @param config - The configuration for the MCP handler.
 * @returns An object containing the endpoints for the MCP handler.
 */
export function calculateEndpoints({
  basePath,
  streamableHttpEndpoint = "/mcp",
  sseEndpoint = "/sse",
  sseMessageEndpoint = "/message",
}: Config) {
  const {
    streamableHttpEndpoint: fullStreamableHttpEndpoint,
    sseEndpoint: fullSseEndpoint,
    sseMessageEndpoint: fullSseMessageEndpoint,
  } = basePath != null
    ? deriveEndpointsFromBasePath(basePath)
    : {
        streamableHttpEndpoint,
        sseEndpoint,
        sseMessageEndpoint,
      };

  return {
    streamableHttpEndpoint: fullStreamableHttpEndpoint,
    sseEndpoint: fullSseEndpoint,
    sseMessageEndpoint: fullSseMessageEndpoint,
  };
}

export function initializeMcpApiHandler(
  initializeServer:
    | ((server: McpServer) => Promise<void>)
    | ((server: McpServer) => void),
  serverOptions: ServerOptions = {},
  config: Config = {}
): (req: Request) => Promise<Response> {
  const {
    basePath,
    streamableHttpEndpoint: explicitStreamableHttpEndpoint,
    sseEndpoint: explicitSseEndpoint,
    sseMessageEndpoint: explicitSseMessageEndpoint,
    verboseLogs,
    disableSse,
    onEvent,
  } = config;

  const {
    serverInfo = {
      name: "mcp-typescript server on vercel",
      version: "0.1.0",
    },
    ...mcpServerOptions
  } = serverOptions;

  const { streamableHttpEndpoint, sseEndpoint, sseMessageEndpoint } =
    calculateEndpoints({
      basePath,
      streamableHttpEndpoint: explicitStreamableHttpEndpoint,
      sseEndpoint: explicitSseEndpoint,
      sseMessageEndpoint: explicitSseMessageEndpoint,
    });

  const logger = createLogger(verboseLogs);

  const emitError = (error: Error) => {
    logger.error("MCP handler error:", error);
    onEvent?.(
      createEvent<McpErrorEvent>({
        type: "ERROR",
        error,
        source: "request",
        severity: "error",
      })
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
    }
  );

  return async function mcpApiHandler(req: Request): Promise<Response> {
    const url = new URL(req.url || "", "https://example.com");

    if (url.pathname === streamableHttpEndpoint) {
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
            method = String(
              (parsedBody as { method: unknown }).method
            );
            onEvent?.(
              createEvent<McpRequestEvent>({
                type: "REQUEST_RECEIVED",
                method,
                parameters: parsedBody,
                status: "success",
              })
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
            })
          );
        }
        return response;
      } catch (error) {
        emitError(error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    }

    if (url.pathname === sseEndpoint || url.pathname === sseMessageEndpoint) {
      if (disableSse) {
        return new Response("Not found", { status: 404 });
      }
      logger.log(
        `Received request for removed SSE transport endpoint: ${url.pathname}`
      );
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message:
              "The HTTP+SSE transport (protocol 2024-11-05) is no longer supported. Connect using Streamable HTTP.",
          },
          id: null,
        }),
        {
          status: 410,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response("Not found", { status: 404 });
  };
}
