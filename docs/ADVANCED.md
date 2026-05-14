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
import type { Config } from "mcp-handler";

const config: Config = {
  redisUrl: process.env.REDIS_URL,
  basePath: "/api",
  maxDuration: 60,
  verboseLogs: true,
};
```

The exported `Config` type includes all handler options:

```typescript
type Config = {
  redisUrl?: string;    // Redis connection URL for pub/sub
  basePath?: string;    // Base path for MCP endpoints
  maxDuration?: number; // Maximum duration for SSE connections (seconds)
  verboseLogs?: boolean; // Enable debug logging
}
```

## Composable Server Registration

For larger servers, use `InitializeMcpServer` to split tool, prompt, and
resource registration across files while keeping the same handler callback
type:

```typescript
// app/api/[transport]/tools.ts
import type { InitializeMcpServer } from "mcp-handler";
import { z } from "zod";

export const registerTools: InitializeMcpServer = (server) => {
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
        content: [{ type: "text", text: `Rolled ${value}` }],
      };
    }
  );
};
```

```typescript
// app/api/[transport]/route.ts
import { createMcpHandler } from "mcp-handler";
import { registerTools } from "./tools";

const handler = createMcpHandler(registerTools, {}, { basePath: "/api" });

export { handler as GET, handler as POST };
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
