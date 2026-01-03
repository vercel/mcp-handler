# Advanced Usage

## Dynamic Routing

For multi-tenant or dynamic MCP servers:

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
      server.registerTool(
        "roll_dice",
        {
          title: "Roll Dice",
          description: "Roll a dice with a specified number of sides.",
          inputSchema: { sides: z.number().int().min(2) },
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
      capabilities: {
        tools: {
          roll_dice: { description: "Roll a dice" },
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

## Configuration Options

```typescript
interface Config {
  redisUrl?: string;    // Redis connection URL for pub/sub
  basePath?: string;    // Base path for MCP endpoints
  maxDuration?: number; // Maximum duration for SSE connections (seconds)
  verboseLogs?: boolean; // Enable debug logging
}
```

## Nuxt Usage

```typescript
// server/api/mcp/[transport].ts
import { createMcpHandler } from "mcp-handler";
import { fromWebHandler } from "h3";
import { z } from "zod";

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "roll_dice",
      {
        title: "Roll Dice",
        description: "Roll a dice with a specified number of sides.",
        inputSchema: { sides: z.number().int().min(2) },
      },
      async ({ sides }) => {
        const value = 1 + Math.floor(Math.random() * sides);
        return {
          content: [{ type: "text", text: `🎲 You rolled a ${value}!` }],
        };
      }
    );
  },
  {}
);

export default fromWebHandler(handler);
```
