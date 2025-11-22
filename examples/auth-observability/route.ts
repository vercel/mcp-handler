import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types";
import {
  createMcpHandler,
  withMcpAuth,
  withObservability,
  type ObservabilityConfig,
  addSpanAttribute,
} from "mcp-handler";
import { z } from "zod";

// Define the handler with proper parameter validation
const handler = createMcpHandler(
  (server) => {
    server.tool(
      "secure-echo",
      "Echo a message back with both authentication and observability",
      {
        message: z.string().describe("The message to echo back"),
      },
      async ({ message }, extra) => {
        // Add custom attributes to the current span
        if (extra.authInfo?.clientId) {
          addSpanAttribute("user.client_id", extra.authInfo.clientId);
        }
        
        addSpanAttribute("operation.type", "echo");
        addSpanAttribute("message.length", message.length);

        return {
          content: [
            {
              type: "text",
              text: `Secure Echo: ${message}${
                extra.authInfo?.token
                  ? ` (authenticated as ${extra.authInfo.clientId})`
                  : ""
              }`,
            },
          ],
        };
      }
    );
  },
  // Server capabilities
  {
    capabilities: {
      auth: {
        type: "bearer",
        required: true,
      },
      tools: {},
    },
  },
  // Route configuration
  {
    streamableHttpEndpoint: "/mcp",
    sseEndpoint: "/sse",
    sseMessageEndpoint: "/message",
    basePath: "/api/mcp",
    redisUrl: process.env.REDIS_URL,
  }
);

/**
 * Verify the bearer token and return auth information
 * In a real implementation, this would validate against your auth service
 */
const verifyToken = async (
  req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;

  // Add tracing for auth verification
  addSpanAttribute("auth.token_present", true);

  // TODO: Replace with actual token verification logic
  const isValid = bearerToken.startsWith("__TEST_VALUE__");
  
  addSpanAttribute("auth.validation_result", isValid);

  if (!isValid) return undefined;

  return {
    token: bearerToken,
    scopes: ["read:messages", "write:messages"],
    clientId: "example-client",
    extra: {
      userId: "user-123",
      permissions: ["user"],
      timestamp: new Date().toISOString(),
    },
  };
};

// Observability configuration
const observabilityConfig: ObservabilityConfig = {
  serviceName: "secure-mcp-service",
  serviceVersion: "1.0.0",
  traceIdHeader: "x-trace-id",
  spanIdHeader: "x-span-id",
  customAttributes: {
    "service.environment": process.env.NODE_ENV || "development",
    "service.instance": process.env.HOSTNAME || "local",
    "service.auth_enabled": "true",
  },
  enableRequestLogging: true,
  enableErrorTracking: true,
  ignoreEndpoints: ["/health", "/metrics", "/.well-known/oauth-protected-resource"],
  samplingRate: 1.0,
};

// Apply wrappers in order: observability first, then auth
// This ensures auth errors are also traced
const observabilityHandler = withObservability(handler, observabilityConfig);
const authAndObservabilityHandler = withMcpAuth(observabilityHandler, verifyToken, {
  required: true,
  requiredScopes: ["read:messages"],
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

// Export the handler for both GET and POST methods
export { authAndObservabilityHandler as GET, authAndObservabilityHandler as POST };