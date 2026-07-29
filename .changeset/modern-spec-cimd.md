---
"mcp-handler": major
---

Upgrade to MCP SDK v2 and the 2026-07-28 MCP specification (CIMD era).

- The handler now serves the stateless 2026-07-28 protocol (per-request `_meta` envelope, `server/discover`) natively, with the SDK's stateless legacy fallback answering 2025-era Streamable HTTP clients from the same handler.
- **Breaking**: requires `@modelcontextprotocol/server` ^2.0.0 (replaces the `@modelcontextprotocol/sdk` peer dependency), `zod` ^4.2.0 for schemas, and Node.js 20+.
- **Breaking**: the legacy HTTP+SSE transport (protocol 2024-11-05) has been removed. `/sse` and `/message` endpoints answer `410 Gone`; the `redis` dependency and `redisUrl`, `maxDuration`, and `sessionIdGenerator` config options are deprecated no-ops.
- **Breaking**: tool/prompt/resource registration follows SDK v2 (`registerTool` with `z.object(...)` Standard Schemas; variadic `server.tool(...)` is gone; `extra.authInfo` is now `ctx.http?.authInfo`).
- `withMcpAuth` now builds its 401/403 challenges with the SDK's consolidated `OAuthError`/`bearerAuthChallengeResponse`, keeping RFC 9728 `resource_metadata` discovery in place for CIMD-era authorization flows. Dynamic Client Registration is deprecated by the spec in favor of Client ID Metadata Documents — see README.
