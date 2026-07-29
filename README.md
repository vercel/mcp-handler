# mcp-handler

`mcp-handler` is a framework-agnostic HTTP adapter for hosting Model Context Protocol (MCP) servers in JavaScript and TypeScript applications. It turns an MCP server definition into a Web-standard `(Request) => Promise<Response>` handler that can be mounted in Next.js, Nuxt/Nitro, SvelteKit, Hono, and other Fetch-compatible frameworks.

Built on MCP SDK v2, it serves the **2026-07-28** MCP specification natively while transparently falling back to stateless Streamable HTTP for 2025-era clients — one handler, both protocol generations.

## Installation

```bash
npm install mcp-handler@^2 @modelcontextprotocol/server@^2 zod@^4
```

> **Note**: `mcp-handler` 2.x requires the MCP SDK v2 packages (`@modelcontextprotocol/server` ^2.0.0), zod ^4.2.0, and Node.js 20+. If you're on `@modelcontextprotocol/sdk` 1.x, use `mcp-handler` 1.x.

## Framework Compatibility

`createMcpHandler` returns a Web-standard request handler, so the package is not tied to Vercel or any particular framework. It can be mounted in:

- Next.js Route Handlers
- Nuxt/Nitro server handlers using `fromWebHandler`
- SvelteKit server routes
- Hono routes using `c.req.raw`
- Other frameworks that expose Fetch-compatible `Request` and `Response` APIs

Frameworks based on Node.js `IncomingMessage` and `ServerResponse`, such as Express, require a Web Request adapter or the official MCP framework middleware.

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
        inputSchema: z.object({
          sides: z.number().int().min(2),
        }),
      },
      async ({ sides }) => {
        const value = 1 + Math.floor(Math.random() * sides);
        return {
          content: [{ type: "text", text: `🎲 You rolled a ${value}!` }],
        };
      },
    );
  },
  {},
  {
    basePath: "/api", // must match where [transport] is located
    verboseLogs: true,
  },
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

## Protocol Support

- **2026-07-28** (current): served natively — stateless, no sessions, per-request `_meta` envelope, `server/discover`.
- **2025-era Streamable HTTP**: served via the SDK's stateless legacy fallback from the same handler. GET/DELETE session operations answer `405` (serving is stateless).
- **HTTP+SSE transport (2024-11-05)**: removed in 2.x. Requests to the `/sse` and `/message` endpoints answer `410 Gone`. Redis is no longer needed or used.

### Authorization (CIMD era)

The 2026-07-28 spec deprecates Dynamic Client Registration (DCR) in favor of **Client ID Metadata Documents (CIMD)**, where the OAuth client identifies itself with an HTTPS URL that serves its metadata. CIMD support is advertised and implemented by your **authorization server** (`client_id_metadata_document_supported` in its RFC 8414 metadata); this package keeps your MCP server's resource-server surface up to date:

- `withMcpAuth` verifies bearer tokens and answers `401`/`403` with RFC 9728-compliant `WWW-Authenticate` challenges pointing at your protected resource metadata.
- `protectedResourceHandler` serves the RFC 9728 Protected Resource Metadata document listing your authorization servers.

See [Authorization](docs/AUTHORIZATION.md) for wiring details.

## Migrating from 1.x

- Install `@modelcontextprotocol/server` (v2) and `zod@^4`; remove `@modelcontextprotocol/sdk` and `redis`.
- `inputSchema`/`argsSchema` take a full Standard Schema (e.g. `z.object({ ... })`) instead of a raw zod shape.
- Variadic `server.tool(...)` / `.prompt(...)` / `.resource(...)` are removed — use `registerTool` / `registerPrompt` / `registerResource`.
- In handler callbacks, `extra.authInfo` is now `ctx.http?.authInfo`.
- Config options `redisUrl`, `maxDuration`, `sseEndpoint`, `sseMessageEndpoint`, and `sessionIdGenerator` are deprecated no-ops.

## Documentation

- [Client Integration](docs/CLIENTS.md) - Claude Desktop, Cursor, Windsurf setup
- [Authorization](docs/AUTHORIZATION.md) - OAuth and token verification
- [Advanced Usage](docs/ADVANCED.md) - Dynamic routing, Nuxt, configuration options

## Features

- **Framework-agnostic**: Web-standard `Request` and `Response` handler
- **Framework compatibility**: Next.js, Nuxt/Nitro, SvelteKit, Hono, and other Fetch-compatible frameworks
- **Dual-era protocol support**: 2026-07-28 (stateless) and 2025-era Streamable HTTP from one handler
- **TypeScript Support**: Full type definitions included

## Requirements

- Node.js 20+
- A framework with Web-standard `Request` and `Response` APIs, either directly or through an adapter
- Next.js 13+ when using Next.js, or Nuxt 3+ when using Nuxt

## License

Apache-2.0
