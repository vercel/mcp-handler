import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createMcpHandler, experimental_withMcpAuth as withMcpAuth } from "@vercel/mcp-adapter";
import { z } from "zod";
import * as stytch from "stytch";

const client = new stytch.Client({
  project_id: process.env.STYTCH_PROJECT_ID as string,
  secret: process.env.STYTCH_SECRET as string,
  custom_base_url: `https://${process.env.STYTCH_DOMAIN}`,
});

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
const verifyToken = async (_: Request, token?: string): Promise<AuthInfo | undefined> => {
  if (!token) return;
  const { audience, scope, expires_at, ...rest } =
    await client.idp.introspectTokenLocal(token);
  return {
    token,
    clientId: audience as string,
    scopes: scope.split(" "),
    expiresAt: expires_at,
    extra: rest,
  } satisfies AuthInfo;
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
