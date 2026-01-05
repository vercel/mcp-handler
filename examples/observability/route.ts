import {
  createMcpHandler,
  withObservability,
  type ObservabilityConfig,
} from "mcp-handler";
import { z } from "zod";

// Define the handler with proper parameter validation
const handler = createMcpHandler(
  (server) => {
    server.tool(
      "echo-with-tracing",
      "Echo a message back with observability tracing",
      {
        message: z.string().describe("The message to echo back"),
      },
      async ({ message }, extra) => {
        // You can add custom span attributes within your handler
        if (typeof req !== 'undefined' && req.traceId) {
          console.log(`Processing echo request with trace ID: ${req.traceId}`);
        }

        return {
          content: [
            {
              type: "text",
              text: `Echo: ${message}`,
            },
          ],
        };
      }
    );
  },
  // Server capabilities
  {
    capabilities: {
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

// Observability configuration
const observabilityConfig: ObservabilityConfig = {
  serviceName: "mcp-echo-service",
  serviceVersion: "1.0.0",
  traceIdHeader: "x-trace-id",
  spanIdHeader: "x-span-id",
  customAttributes: {
    "service.environment": process.env.NODE_ENV || "development",
    "service.instance": process.env.HOSTNAME || "local",
  },
  enableRequestLogging: true,
  enableErrorTracking: true,
  ignoreEndpoints: ["/health", "/metrics"],
  samplingRate: 1.0, // 100% sampling for demo, adjust as needed
};

// Wrap the handler with observability
const observabilityHandler = withObservability(handler, observabilityConfig);

// Export the handler for both GET and POST methods
export { observabilityHandler as GET, observabilityHandler as POST };