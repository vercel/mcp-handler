import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createMcpHandler, experimental_withMcpAuth as withMcpAuth } from "@vercel/mcp-adapter";
import { z } from "zod";

// Define the handler with proper parameter validation
const handler = createMcpHandler(
  server => {
    server.tool(
      'echo',
      'Echo a message back with authentication info',
      {
        message: z.string().describe('The message to echo back')
      },
      async ({ message }, extra) => {
        return {
          content: [
            {
              type: 'text',
              text: `Echo: ${message}${extra.authInfo?.token ? ` (from ${extra.authInfo.clientId})` : ''}`,
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
        type: 'bearer',
        required: true,
      },
    },
  },
  {}
);

/**
 * Verify the bearer token and return auth information
 * In a real implementation, this would validate against your auth service
 */
const verifyToken = async (_: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
    if (!bearerToken) return undefined;
    
    const isValid = bearerToken.startsWith('__TEST_VALUE__');
    
    if (!isValid) return undefined;
    
    return {
        token: bearerToken,
        scopes: ['read:messages', 'write:messages'],
        clientId: 'example-client',
        extra: {
            userId: 'user-123',
            // Add any additional user/client information here
            permissions: ['user'],
            timestamp: new Date().toISOString()
        }
    };
}

// Create the auth handler with required scopes
const authHandler = withMcpAuth(
    handler,
    verifyToken,
    {
        required: true,
        requiredScopes: ['openid'],
        resourceMetadataPath: '/.well-known/oauth-protected-resource'
    }
);

// Export the handler for both GET and POST methods
export { authHandler as GET, authHandler as POST };
