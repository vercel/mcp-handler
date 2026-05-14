import { type Config, initializeMcpApiHandler } from "./mcp-api-handler";
import { createServerResponseAdapter } from "./server-response-adapter";
import type { ServerOptions as McpServerOptions } from "@modelcontextprotocol/sdk/server/index.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Creates a MCP handler that can be used to handle MCP requests.
 * @param initializeServer - A function that initializes the MCP server. Use this to access the server instance and register tools, prompts, and resources.
 * @param serverOptions - Options for the MCP server.
 * @param config - Configuration for the MCP handler.
 * @returns A function that can be used to handle MCP requests.
 */

export type ServerOptions = McpServerOptions & {
  serverInfo?: {
    name: string;
    version: string;
  };
};

export type InitializeMcpServer =
  | ((server: McpServer) => Promise<void>)
  | ((server: McpServer) => void);

export type { Config };

export default function createMcpRouteHandler(
  initializeServer: InitializeMcpServer,
  serverOptions?: ServerOptions,
  config?: Config
): (request: Request) => Promise<Response> {
  const mcpHandler = initializeMcpApiHandler(
    initializeServer,
    serverOptions,
    config
  );
  return (request: Request) => {
    return createServerResponseAdapter(request.signal, (res) => {
      mcpHandler(request, res);
    });
  };
}
