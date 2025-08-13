import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { randomUUID } from "crypto";

// Session storage for demonstration
const sessions = new Map<string, { userId?: string; context: any }>();

// Define the handler with session management
const handler = createMcpHandler(
  (server) => {
    server.tool(
      "get-session-info",
      "Get information about the current session",
      {},
      async (_, extra) => {
        const sessionId = extra.requestId; // You can access session context here
        const sessionData = sessions.get(sessionId) || {};
        
        return {
          content: [
            {
              type: "text",
              text: `Session ID: ${sessionId}, Data: ${JSON.stringify(sessionData)}`,
            },
          ],
        };
      }
    );

    server.tool(
      "set-session-context",
      "Set context data for the current session",
      {
        key: z.string().describe("The key to set"),
        value: z.string().describe("The value to set"),
      },
      async ({ key, value }, extra) => {
        const sessionId = extra.requestId;
        const session = sessions.get(sessionId) || { context: {} };
        session.context[key] = value;
        sessions.set(sessionId, session);
        
        return {
          content: [
            {
              type: "text",
              text: `Set ${key} = ${value} for session ${sessionId}`,
            },
          ],
        };
      }
    );
  },
  // Server options with session management
  {
    serverInfo: {
      name: "stateful-session-server",
      version: "1.0.0",
    },
    // Optional: provide a custom sessionId
    // sessionId: "custom-session-id",
    
    // Callback when session is initialized
    onSessionInitialized: (sessionId: string) => {
      console.log(`🚀 New session initialized: ${sessionId}`);
      
      // Initialize session data
      sessions.set(sessionId, {
        userId: undefined,
        context: {
          createdAt: new Date().toISOString(),
          requestCount: 0,
        }
      });
    },
  },
  // Route configuration
  {
    streamableHttpEndpoint: "/mcp",
    sseEndpoint: "/sse", 
    sseMessageEndpoint: "/message",
    basePath: "/api/stateful",
    redisUrl: process.env.REDIS_URL,
    verboseLogs: true,
  }
);

// Export the handler for both GET and POST methods
export { handler as GET, handler as POST };