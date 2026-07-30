# Advanced Usage

## Dynamic Routing

For multi-tenant or dynamic MCP servers:

```typescript
// app/dynamic/[p]/mcp/route.ts
import { createMcpHandler } from "mcp-handler";
import type { NextRequest } from "next/server";
import { z } from "zod";

const handler = async (
  req: NextRequest,
  { params }: { params: Promise<{ p: string }> },
) => {
  const { p } = await params;

  return createMcpHandler((server) => {
    server.registerTool(
      "roll_dice",
      {
        title: "Roll Dice",
        description: `Roll a dice for tenant ${p}.`,
        inputSchema: z.object({ sides: z.number().int().min(2) }),
      },
      async ({ sides }) => {
        const value = 1 + Math.floor(Math.random() * sides);
        return {
          content: [
            { type: "text", text: `🎲 Tenant ${p} rolled a ${value}!` },
          ],
        };
      },
    );
  })(req);
};

export { handler as GET, handler as POST };
```

## Configuration Options

```typescript
interface Config {
  verboseLogs?: boolean; // Enable debug logging
  onEvent?: (event: McpEvent) => void | Promise<void>; // Analytics/debugging callback
  allowedOriginHostnames?: string[]; // Additional browser Origin hostnames
}
```

Requests with an `Origin` header are accepted when the Origin hostname matches
the public MCP server hostname. Add hostname-only entries (without a scheme or
port) to `allowedOriginHostnames` when a browser-based client is hosted on a
different hostname:

```typescript
const handler = createMcpHandler(
  initializeServer,
  {},
  {
    allowedOriginHostnames: ["inspector.example.com"],
  },
);
```

Server-side MCP clients normally omit `Origin` and are unaffected. Event
callbacks may be synchronous or asynchronous; callback failures are logged
when `verboseLogs` is enabled and never fail the MCP request.

## Nuxt Usage

```typescript
// server/routes/mcp.ts
import { createMcpHandler } from "mcp-handler";
import { fromWebHandler } from "h3";
import { z } from "zod";

const handler = createMcpHandler((server) => {
  server.registerTool(
    "roll_dice",
    {
      title: "Roll Dice",
      description: "Roll a dice with a specified number of sides.",
      inputSchema: z.object({ sides: z.number().int().min(2) }),
    },
    async ({ sides }) => {
      const value = 1 + Math.floor(Math.random() * sides);
      return {
        content: [{ type: "text", text: `🎲 You rolled a ${value}!` }],
      };
    },
  );
});

export default fromWebHandler(handler);
```
