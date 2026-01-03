# mcp-handler

A Vercel adapter for the Model Context Protocol (MCP), enabling real-time communication between your applications and AI models. Supports Next.js and Nuxt.

## Installation

```bash
npm install mcp-handler @modelcontextprotocol/sdk@1.25.0 zod@^3
```

> **Note**: The recommended version for `@modelcontextprotocol/sdk` is 1.25.0

## Quick Start (Next.js)

```typescript
// app/api/[transport]/route.ts
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "roll_dice",
      {
        title: "Roll Dice",
        description: "Roll a dice with a specified number of sides.",
        inputSchema: {
          sides: z.number().int().min(2),
        },
      },
      async ({ sides }) => {
        const value = 1 + Math.floor(Math.random() * sides);
        return {
          content: [{ type: "text", text: `🎲 You rolled a ${value}!` }],
        };
      }
    );
  },
  {},
  {
    basePath: "/api", // must match where [transport] is located
    maxDuration: 60,
    verboseLogs: true,
  }
);

export { handler as GET, handler as POST };
```

## Connecting Clients

If your client supports Streamable HTTP, connect directly:

```json
{
  "remote-example": {
    "url": "http://localhost:3000/api/mcp"
  }
}
```

For stdio-only clients, use [mcp-remote](https://www.npmjs.com/package/mcp-remote):

```json
{
  "remote-example": {
    "command": "npx",
    "args": ["-y", "mcp-remote", "http://localhost:3000/api/mcp"]
  }
}
```

## Documentation

- [Client Integration](docs/CLIENTS.md) - Claude Desktop, Cursor, Windsurf setup
- [Authorization](docs/AUTHORIZATION.md) - OAuth and token verification
- [Advanced Usage](docs/ADVANCED.md) - Dynamic routing, Nuxt, configuration options

## Features

- **Framework Support**: Next.js and Nuxt
- **Multiple Transports**: Streamable HTTP and Server-Sent Events (SSE)
- **Redis Integration**: Optional, for SSE transport resumability
- **TypeScript Support**: Full type definitions included

## Requirements

- Next.js 13+ or Nuxt 3+
- Node.js 18+
- Redis (optional, for SSE)

## License

Apache-2.0
