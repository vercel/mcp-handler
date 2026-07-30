---
"mcp-handler": minor
---

`createMcpHandler(initialize, serverOptions, config)` is now `createMcpHandler(initialize, options)` — a single options object combining the SDK's `ServerOptions` with `serverInfo`, `verboseLogs`, and `onEvent` (exported as `McpHandlerOptions`). The deprecated 1.x compatibility shims (`basePath`, `streamableHttpEndpoint`, `sseEndpoint`, `sseMessageEndpoint`, `disableSse`, `redisUrl`, `maxDuration`, `sessionIdGenerator`) are removed.
