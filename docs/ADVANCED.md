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

## Progress Notifications

Tool handlers receive the MCP request context as their second argument. Use `ctx.mcpReq._meta?.progressToken` to check whether the client requested progress updates, then send `notifications/progress` with `ctx.mcpReq.notify(...)`.

```typescript
// app/api/[transport]/route.ts
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const handler = createMcpHandler((server) => {
  server.registerTool(
    "long_task",
    {
      title: "Long Task",
      description: "Run a multi-step task and report progress when requested.",
      inputSchema: {
        steps: z.number().int().min(1).max(10),
      },
    },
    async ({ steps }, ctx) => {
      const progressToken = ctx.mcpReq._meta?.progressToken;

      for (let progress = 1; progress <= steps; progress++) {
        if (progressToken !== undefined) {
          await ctx.mcpReq.notify({
            method: "notifications/progress",
            params: {
              progressToken,
              progress,
              total: steps,
              message: `Completed step ${progress} of ${steps}`,
            },
          });
        }
      }

      return {
        content: [{ type: "text", text: "Task complete" }],
      };
    }
  );
});

export { handler as GET, handler as POST };
```

Progress notifications are only associated with a request when the client includes a progress token in `_meta`. If no token is present, complete the tool normally without sending progress notifications.

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
