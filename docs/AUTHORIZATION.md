# Authorization

The MCP adapter supports the [MCP Authorization Specification](https://modelcontextprotocol.io/specification/draft/basic/authorization) through the `withMcpAuth` wrapper.

## Basic Usage

```typescript
// app/api/[transport]/route.ts
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "echo",
      {
        title: "Echo",
        description: "Echo a message",
        inputSchema: { message: z.string() },
      },
      async ({ message }, extra) => {
        // Access auth info via extra.authInfo
        return {
          content: [
            {
              type: "text",
              text: `Echo: ${message}${
                extra.authInfo?.token
                  ? ` for user ${extra.authInfo.clientId}`
                  : ""
              }`,
            },
          ],
        };
      }
    );
  },
  {}
);

// Token verification function
const verifyToken = async (
  req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;

  // Replace with actual token verification logic
  const isValid = bearerToken.startsWith("__TEST_VALUE__");
  if (!isValid) return undefined;

  return {
    token: bearerToken,
    scopes: ["read:stuff"],
    clientId: "user123",
    extra: { userId: "123" },
  };
};

// Wrap handler with authorization
const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  requiredScopes: ["read:stuff"],
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

export { authHandler as GET, authHandler as POST };
```

## OAuth Protected Resource Metadata

Create `app/.well-known/oauth-protected-resource/route.ts`:

```typescript
import {
  protectedResourceHandler,
  metadataCorsOptionsRequestHandler,
} from "mcp-handler";

const handler = protectedResourceHandler({
  authServerUrls: ["https://auth-server.com"],
});

const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
```

This endpoint provides:
- `resource`: The URL of your MCP server
- `authorization_servers`: Array of OAuth authorization server Issuer URLs

The path should match `resourceMetadataPath` in your `withMcpAuth` config (default: `/.well-known/oauth-protected-resource`).

## Authorization Flow

1. Client makes a request with a Bearer token in the Authorization header
2. `verifyToken` validates the token and returns auth info
3. If auth is required and fails → 401 response
4. If required scopes are missing → 403 response
5. On success, auth info is available via `extra.authInfo` in tool handlers
