# @vercel/mcp-adapter

A Vercel adapter for the Model Context Protocol (MCP), enabling real-time communication between your applications and AI models. Currently supports Next.js with more framework adapters coming soon.


## Installation

```bash
npm install @vercel/mcp-adapter @modelcontextprotocol/sdk
# or
yarn add @vercel/mcp-adapter @modelcontextprotocol/sdk
# or
pnpm add @vercel/mcp-adapter @modelcontextprotocol/sdk
# or
bun add @vercel/mcp-adapter @modelcontextprotocol/sdk
```

## Next.js Usage

```typescript
// app/api/[transport]/route.ts
import { createMcpHandler } from "@vercel/mcp-adapter";
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

## Connecting to your MCP server via stdio

Depending on the version of your client application, remote MCP's may need to use
[mcp-remote](https://www.npmjs.com/package/mcp-remote) to proxy Streamble HTTP into stdio.

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
    "mcp-remote",
    "-y",
    "http://localhost:3000/api/mcp" // this is your app/api/[transport]/route.ts
  ]
}
```

## Integrating into your client

When you want to use it in your MCP client of choice:

Depending on the version of your client application, remote MCP's may need to use
[mcp-remote](https://www.npmjs.com/package/mcp-remote) to proxy Streamble HTTP into Stdio.

### Claude Desktop

[Official Docs](https://modelcontextprotocol.io/quickstart/user)

In order to add an MCP server to Claude Desktop you need to edit the configuration file located at:

```typescript
"remote-example": {
  "command": "npx",
  "args": [
    "mcp-remote",
    "-y",
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
  basePath?: string; // string; // Base path for MCP endpoints
  maxDuration?: number; // Maximum duration for SSE connections in seconds
  verboseLogs?: boolean; // Log debugging information
}
```

## Authorization

The MCP adapter supports OAuth Bearer Token authentication through the `experimental_withMcpAuth` wrapper. This allows you to protect your MCP endpoints and access authentication information in your tools.

### Basic Usage

```typescript
// app/api/[transport]/route.ts
import { createMcpHandler, experimental_withMcpAuth } from "@vercel/mcp-adapter";

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
          content: [{ 
            type: "text", 
            text: `Echo: ${message}${extra.authInfo?.token ? ` for user ${extra.authInfo.clientId}` : ''}`
          }],
        };
      }
    );
  },
  {
    // Optional server options
  }
);

// Wrap your handler with authorization
const verifyToken = async (req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;

  // TODO: Replace with actual token verification logic
  // This is just an example implementation
  // Return an AuthInfo object if verification succeeds
  // Otherwise, return undefined
  const isValid = bearerToken.startsWith('__TEST_VALUE__');
  
  if (!isValid) return undefined;
  
  return {
    token: bearerToken,
    scopes: ["read:stuff"], // Add relevant scopes
    clientId: "user123",    // Add user/client identifier
    extra: {               // Optional extra information
      userId: "123"
    }
  };
};

// Make authorization required
const authHandler = experimental_withMcpAuth(handler, verifyToken, { 
  required: true,                    // Make auth required for all requests
  requiredScopes: ["read:stuff"],    // Optional: Require specific scopes
  resourceMetadataPath: "/.well-known/oauth-protected-resource" // Optional: Custom metadata path
});

export { authHandler as GET, authHandler as POST };
```

### OAuth Resource Metadata

When implementing authorization in MCP, you must define the OAuth [Protected Resource Metadata](https://modelcontextprotocol.io/specification/draft/basic/authorization#authorization-server-location) endpoint. This endpoint provides information about your MCP server's authentication requirements to clients.

Create a new file at `app/.well-known/oauth-protected-resource/route.ts`:

```typescript
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  
  return Response.json({
    resource: `${origin}`,
    authorization_servers: [`https://authorization-server-issuer.com`],
    scopes_supported: ["openid"],
    resource_name: "MCP Server",
    resource_documentation: `${origin}/docs`
  });
}
```

This endpoint provides:
- `resource`: The URL of your MCP server
- `authorization_servers`: Array of OAuth authorization server Issuer URLs that can issue valid tokens
- `scopes_supported`: Array of OAuth scopes supported by your server
- `resource_name`: Human-readable name for your MCP server
- `resource_documentation`: URL to your server's documentation

The path to this endpoint should match the `resourceMetadataPath` option in your `withMcpAuth` configuration,
which by default is `/.well-known/oauth-protected-resource` (the full URL will be `https://your-domain.com/.well-known/oauth-protected-resource`).

### Authentication Flow

1. Client makes a request with a Bearer token in the Authorization header
2. The `verifyToken` function validates the token and returns auth info
3. If authentication is required and fails, a 401 response is returned
4. If specific scopes are required and missing, a 403 response is returned
5. On successful authentication, the auth info is available in tool handlers via `extra.authInfo`

## Features

- **Framework Support**: Currently supports Next.js with more framework adapters coming soon
- **Multiple Transport Options**: Supports both Streamable HTTP and Server-Sent Events (SSE) transports
- **Redis Integration**: For SSE transport resumability
- **TypeScript Support**: Full TypeScript support with type definitions

## Requirements

- Next.js 13 or later (for Next.js adapter)
- Node.js 18 or later
- Redis (optional, for SSE transport)

## License

Apache-2.0
