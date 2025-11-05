# mcp-handler

A Vercel adapter for the Model Context Protocol (MCP), enabling real-time communication between your applications and AI models. Currently supports Next.js and Nuxt with more framework adapters coming soon.

## Installation

```bash
npm install mcp-handler @modelcontextprotocol/sdk zod@^3
# or
yarn add mcp-handler @modelcontextprotocol/sdk zod@^3
# or
pnpm add mcp-handler @modelcontextprotocol/sdk zod@^3
# or
bun add mcp-handler @modelcontextprotocol/sdk zod@^3
```

## Next.js Usage

```typescript
// app/api/[transport]/route.ts
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
const handler = createMcpHandler(
  (server) => {
    server.tool(
      "roll_dice",
      "Rolls an N-sided die",
      {
        sides: z.number().int().min(2),
      },
      async ({ sides }) => {
        const value = 1 + Math.floor(Math.random() * sides);
        return {
          content: [{ type: "text", text: `🎲 You rolled a ${value}!` }],
        };
      }
    );
  },
  {
    // Optional server options
  },
  {
    // Optional redis config
    redisUrl: process.env.REDIS_URL,
    basePath: "/api", // this needs to match where the [transport] is located.
    maxDuration: 60,
    verboseLogs: true,
  }
);
export { handler as GET, handler as POST };
```

### Advanced Routing

```typescript
// app/dynamic/[p]/[transport]/route.ts

import { createMcpHandler } from "mcp-handler";
import type { NextRequest } from "next/server";
import { z } from "zod";

const handler = async (
  req: NextRequest,
  { params }: { params: Promise<{ p: string; transport: string }> }
) => {
  const { p, transport } = await params;

  return createMcpHandler(
    (server) => {
      server.tool(
        "roll_dice",
        "Rolls an N-sided die",
        { sides: z.number().int().min(2) },
        async ({ sides }) => {
          const value = 1 + Math.floor(Math.random() * sides);
          return {
            content: [{ type: "text", text: `🎲 You rolled a ${value}!` }],
          };
        }
      );
    },
    {
      capabilities: {
        tools: {
          roll_dice: {
            description: "Roll a dice",
          },
        },
      },
    },
    {
      redisUrl: process.env.REDIS_URL,
      basePath: `/dynamic/${p}`,
      verboseLogs: true,
      maxDuration: 60,
    }
  )(req);
};
export { handler as GET, handler as POST, handler as DELETE };
```

## Nuxt Usage

```typescript
// server/api/mcp/[transport].ts

import { createMcpHandler } from "mcp-handler";
import { getHeader, defineEventHandler, fromWebHandler } from "h3";
import { z } from "zod";

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "roll_dice",
      "Rolls an N-sided die",
      {
        sides: z.number().int().min(2),
      },
      async ({ sides }) => {
        const value = 1 + Math.floor(Math.random() * sides);
        return {
          content: [{ type: "text", text: `🎲 You rolled a ${value}!` }],
        };
      }
    );
  },
  {
    // Optional server options
  }
);

export default fromWebHandler(handler);
```

## Connecting to your MCP server via stdio

Depending on the version of your client application, remote MCP's may need to use
[mcp-remote](https://www.npmjs.com/package/mcp-remote) to proxy Streamable HTTP into stdio.

If your client supports it, it's recommended to connect to the Streamable HTTP endpoint directly such as:

```typescript
"remote-example": {
  "url": "http://localhost:3000/api/mcp",
}
```

Due to client versions, and varying levels of support, you can list `mcp-remote` as the method for end users to connect to your MCP server.

The above set up snippet will then look like:

```typescript
"remote-example": {
  "command": "npx",
  "args": [
    "-y",
    "mcp-remote",
    "http://localhost:3000/api/mcp" // this is your app/api/[transport]/route.ts
  ]
}
```

## Integrating into your client

When you want to use it in your MCP client of choice:

Depending on the version of your client application, remote MCP's may need to use
[mcp-remote](https://www.npmjs.com/package/mcp-remote) to proxy Streamable HTTP into Stdio.

### Claude Desktop

[Official Docs](https://modelcontextprotocol.io/quickstart/user)

In order to add an MCP server to Claude Desktop you need to edit the configuration file located at:

```typescript
"remote-example": {
  "command": "npx",
  "args": [
    "-y",
    "mcp-remote",
    "http://localhost:3000/api/mcp" // this is your app/api/[transport]/route.ts
  ]
}
```

macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
Windows: %APPDATA%\Claude\claude_desktop_config.json
If it does not exist yet, you may need to enable it under Settings > Developer.

Restart Claude Desktop to pick up the changes in the configuration file. Upon restarting, you should see a hammer icon in the bottom right corner of the input box.

### Cursor

[Official Docs](https://docs.cursor.com/context/model-context-protocol)

The configuration file is located at ~/.cursor/mcp.json.

As of version 0.48.0, Cursor supports unauthed SSE servers directly. If your MCP server is using the official MCP OAuth authorization protocol, you still need to add a "command" server and call mcp-remote.

### Windsurf

[Official Docs](https://docs.codeium.com/windsurf/mcp)

The configuration file is located at ~/.codeium/windsurf/mcp_config.json.

## Usage in your app

1. Use the MCP client in your application:

```typescript
// app/components/YourComponent.tsx
import { McpClient } from "@modelcontextprotocol/sdk/client";

const client = new McpClient({
  // When using basePath, the SSE endpoint will be automatically derived
  transport: new SSEClientTransport("/api/mcp/mcp"),
});

// Use the client to make requests
const result = await client.request("yourMethod", { param: "value" });
```

## Configuration Options

The `initializeMcpApiHandler` function accepts the following configuration options:

```typescript
interface Config {
  redisUrl?: string; // Redis connection URL for pub/sub
  basePath?: string; // Base path for MCP endpoints
  maxDuration?: number; // Maximum duration for SSE connections in seconds
  verboseLogs?: boolean; // Log debugging information
}
```

## Authorization

The MCP adapter supports the [MCP Authorization Specification](https://modelcontextprotocol.io/specification/draft/basic/authorization) through the `withMcpAuth` wrapper. This allows you to protect your MCP endpoints and access authentication information in your tools.

### Basic Usage

```typescript
// app/api/[transport]/route.ts
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";

// Create your handler as normal
const handler = createMcpHandler(
  (server) => {
    server.tool(
      "echo",
      "Echo a message",
      { message: z.string() },
      async ({ message }, extra) => {
        // Access auth info in your tools via extra.authInfo
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

    server.tool(
      "admin_action",
      "Admin-only action",
      { action: z.string() },
      async ({ action }, extra) => {
        return {
          content: [
            {
              type: "text",
              text: `Admin action: ${action}`,
            },
          ],
        };
      }
    );
  },
  {
    // Optional server options
  }
);

// Wrap your handler with authorization
const verifyToken = async (
  req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;

  // Replace this example with actual token verification logic
  // Return an AuthInfo object if verification succeeds
  // Otherwise, return undefined
  const isValid = bearerToken.startsWith("__TEST_VALUE__");

  if (!isValid) return undefined;

  return {
    token: bearerToken,
    scopes: ["read:echo", "admin:write"], // Add relevant scopes based on token
    clientId: "user123", // Add user/client identifier
    extra: {
      // Optional extra information
      userId: "123",
    },
  };
};

// Apply authentication with tool-specific scopes
const authHandler = withMcpAuth(handler, verifyToken, {
  required: true, // Make auth required for all requests
  requiredToolScopes: {
    echo: ["read:echo"], // Only needs 'read:echo' scope
    admin_action: ["admin:write"], // Requires 'admin:write' scope
  },
  resourceMetadataPath: "/.well-known/oauth-protected-resource", // Optional: Custom metadata path
});

export { authHandler as GET, authHandler as POST };
```

### Using Both requiredScopes and requiredToolScopes Together

`requiredScopes` are validated first (403 if missing), then `requiredToolScopes` per tool call:

```typescript
const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  requiredScopes: ["read:stuff"],
  requiredToolScopes: {
    echo: ["read:echo"],
    admin_action: ["admin:write"],
  },
});
```

### Alternative: Global Scope Requirements Only

```typescript
const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  requiredScopes: ["read:stuff"],
});
```

**Note:** `requiredToolScopes` (with or without `requiredScopes`) is recommended for [progressive authorization and granular access control](https://modelcontextprotocol.io/specification/draft/basic/authorization#scope-challenge-handling).

### OAuth Protected Resource Metadata

When implementing authorization in MCP, you must define the OAuth [Protected Resource Metadata](https://modelcontextprotocol.io/specification/draft/basic/authorization#authorization-server-location) endpoint. This endpoint provides information about your MCP server's authentication requirements to clients.

Create a new file at `app/.well-known/oauth-protected-resource/route.ts`:

```typescript
import {
  protectedResourceHandler,
  metadataCorsOptionsRequestHandler,
} from "mcp-handler";

const handler = protectedResourceHandler({
  // Specify the Issuer URL of the associated Authorization Server
  authServerUrls: ["https://auth-server.com"],
});

const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
```

This endpoint provides:

- `resource`: The URL of your MCP server
- `authorization_servers`: Array of OAuth authorization server Issuer URLs that can issue valid tokens

The path to this endpoint should match the `resourceMetadataPath` option in your `withMcpAuth` configuration,
which by default is `/.well-known/oauth-protected-resource` (the full URL will be `https://your-domain.com/.well-known/oauth-protected-resource`).

### Authorization Flow

1. Client makes a request with a Bearer token in the Authorization header
2. The `verifyToken` function validates the token and returns auth info with associated scopes
3. If authentication is required and fails, a 401 response is returned
4. If tool-specific scopes (defined in `requiredToolScopes`) or global scopes (defined in `requiredScopes`) are required and missing, a 403 response is returned with the required scopes in the `WWW-Authenticate` header
5. On successful authentication, the auth info is available in tool handlers via `extra.authInfo`

### Per-Tool Scope Validation

The MCP handler supports per-tool scope validation, allowing you to define specific scope requirements for each tool. This enables progressive authorization where clients can start with minimal permissions and request additional scopes as needed.

#### Basic Per-Tool Scope Configuration

```typescript
// app/api/[transport]/route.ts
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "roll_dice",
      "Rolls an N-sided die",
      { sides: z.number().int().min(2) },
      async ({ sides }) => {
        const value = 1 + Math.floor(Math.random() * sides);
        return {
          content: [{ type: "text", text: `🎲 You rolled a ${value}!` }],
        };
      }
    );

    server.tool(
      "admin_delete",
      "Admin tool to delete data",
      { id: z.string() },
      async ({ id }) => {
        return {
          content: [
            {
              type: "text",
              text: `🗑️ Deleted item with id: ${id}`,
            },
          ],
        };
      }
    );

    server.tool(
      "user_profile",
      "Get user profile information",
      { userId: z.string() },
      async ({ userId }) => {
        return {
          content: [
            {
              type: "text",
              text: `👤 Profile for user: ${userId}`,
            },
          ],
        };
      }
    );
  },
  {
    capabilities: {
      tools: {
        roll_dice: {
          description: "Roll a dice",
        },
        admin_delete: {
          description: "Admin delete operation",
        },
        user_profile: {
          description: "Get user profile",
        },
      },
    },
  }
);

const verifyToken = async (
  req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;

  // Example token validation logic
  const isValid = bearerToken.startsWith("Bearer__EXAMPLE__");

  if (!isValid) return undefined;

  // Return different scopes based on token type
  if (bearerToken.includes("admin")) {
    return {
      token: bearerToken,
      scopes: ["roll:dice", "delete:admin", "read:profile"],
      clientId: "admin-client",
      extra: {
        userId: "admin-user",
        permissions: ["admin"],
      },
    };
  } else {
    return {
      token: bearerToken,
      scopes: ["roll:dice", "read:profile"], // No admin scopes
      clientId: "regular-client",
      extra: {
        userId: "regular-user",
        permissions: ["user"],
      },
    };
  }
};

// Apply authentication with tool-specific scopes
const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  requiredToolScopes: {
    roll_dice: ["roll:dice"], // Only needs 'roll:dice' scope
    admin_delete: ["delete:admin"], // Requires admin permissions
    user_profile: ["read:profile"], // Only needs 'read:profile' scope
  },
});

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
```

#### MCP Spec Compliant Error Responses

When a client attempts to call a tool without sufficient scopes, the server returns a 403 Forbidden response following the MCP specification for Scope Challenge Handling:

```http
HTTP/1.1 403 Forbidden
WWW-Authenticate: Bearer error="insufficient_scope",
                         scope="roll:dice read:profile delete:admin",
                         resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource",
                         error_description="Additional permissions required for tool 'admin_delete'. Missing: delete:admin"
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "error": {
    "code": -32003,
    "message": "Additional permissions required for tool 'admin_delete'. Missing: delete:admin"
  },
  "id": null
}
```

#### Step-Up Authorization Flow

The implementation supports the MCP Step-Up Authorization Flow:

1. **Client receives 403 with insufficient scope** - The server returns a 403 response with the `WWW-Authenticate` header containing the required scopes
2. **Client parses scope information** - The client extracts the `scope` parameter from the `WWW-Authenticate` header
3. **Client initiates re-authorization** - The client requests a new token with the additional scopes
4. **Client retries the original request** - The client retries the tool call with the new token

#### Scope Parameter Strategy

The server uses the **recommended approach** for scope inclusion:

- **Includes existing relevant scopes** - Prevents clients from losing previously granted permissions
- **Includes newly required scopes** - Specifies what additional permissions are needed
- **No duplicate scopes** - Ensures clean scope lists

Example scope parameter: `"roll:dice read:profile delete:admin"`

#### Progressive Authorization Example

```typescript
// Client starts with minimal scopes
const userToken = "Bearer__EXAMPLE__user_token"; // scopes: ["roll:dice", "read:profile"]

// ✅ Can call roll_dice and user_profile
await client.callTool({ name: "roll_dice", arguments: { sides: 6 } });
await client.callTool({ name: "user_profile", arguments: { userId: "123" } });

// ❌ Cannot call admin_delete - gets 403 with scope challenge
try {
  await client.callTool({ name: "admin_delete", arguments: { id: "123" } });
} catch (error) {
  // Error includes WWW-Authenticate header with required scopes
  // Client can now request additional scopes and retry
}

// After getting admin token with additional scopes
const adminToken = "Bearer__EXAMPLE__admin_token"; // scopes: ["roll:dice", "delete:admin", "read:profile"]

// ✅ Can now call all tools including admin_delete
await client.callTool({ name: "admin_delete", arguments: { id: "123" } });
```

## Features

- **Framework Support**: Currently supports Next.js with more framework adapters coming soon
- **Multiple Transport Options**: Supports both Streamable HTTP and Server-Sent Events (SSE) transports
- **Redis Integration**: For SSE transport resumability
- **TypeScript Support**: Full TypeScript support with type definitions
- **Per-Tool Scope Validation**: Define specific scope requirements for each tool with MCP spec compliant error responses
- **Progressive Authorization**: Support for step-up authorization flows where clients can request additional scopes as needed
- **MCP Authorization Spec Compliance**: Full support for the MCP Authorization Specification including WWW-Authenticate headers and scope challenge handling

## Requirements

- Next.js 13 or later (for Next.js adapter)
- Node.js 18 or later
- Redis (optional, for SSE transport)

## License

Apache-2.0
