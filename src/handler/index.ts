import { type Config, initializeMcpApiHandler } from "./mcp-api-handler";
import type {
  ServerOptions as McpServerOptions,
  McpServer,
} from "@modelcontextprotocol/server";

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

export default function createMcpRouteHandler(
  initializeServer:
    | ((server: McpServer) => Promise<void>)
    | ((server: McpServer) => void),
  serverOptions?: ServerOptions,
  config?: Config
): (request: Request) => Promise<Response> {
  return initializeMcpApiHandler(initializeServer, serverOptions, config);
}
