# Authorization

The MCP adapter supports the [MCP Authorization Specification](https://modelcontextprotocol.io/specification/draft/basic/authorization) through the `withMcpAuth` wrapper.

## Basic Usage

```typescript
// app/api/[transport]/route.ts
import type { AuthInfo } from "@modelcontextprotocol/server";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "echo",
      {
        title: "Echo",
        description: "Echo a message",
        inputSchema: z.object({ message: z.string() }),
      },
      async ({ message }, ctx) => {
        // Access auth info via ctx.http?.authInfo
        const authInfo = ctx.http?.authInfo;
        return {
          content: [
            {
              type: "text",
              text: `Echo: ${message}${
                authInfo?.token ? ` for user ${authInfo.clientId}` : ""
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
5. On success, auth info is available via `ctx.http?.authInfo` in tool handlers

## CIMD (Client ID Metadata Documents)

The 2026-07-28 MCP spec deprecates Dynamic Client Registration (DCR) in favor of CIMD: OAuth clients identify themselves with an HTTPS URL (`client_id`) that serves their metadata document, removing the need for a registration round-trip.

CIMD is implemented by the **authorization server**, which advertises it via `client_id_metadata_document_supported: true` in its RFC 8414 metadata. As a resource server, your MCP deployment doesn't change beyond what this package already provides — clients discover your authorization servers through the Protected Resource Metadata endpoint above, then negotiate CIMD (or fall back to DCR during the deprecation window) directly with the authorization server. If you operate your own authorization server, enable CIMD there; DCR remains functional for backward compatibility but will be removed in a future spec revision.
