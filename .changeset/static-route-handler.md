---
"mcp-handler": patch
---

Mount the MCP handler directly at a framework route and remove legacy transport endpoint routing. The CLI now generates a static `app/api/mcp/route.ts` (or `src/app/api/mcp/route.ts`), supports `--no-install`, and refuses to overwrite an existing route. Deprecated route, SSE, Redis, and session config keys remain accepted as ignored 2.x compatibility shims.

Reject browser requests from unexpected Origin hostnames by default, add `allowedOriginHostnames` for explicit cross-origin access, preserve the HTTP `Allow: POST` header on stateless `405` responses, and isolate synchronous or asynchronous `onEvent` callback failures from MCP requests.

Ship the documentation linked from the npm README and correct the CommonJS declaration export to the generated `dist/index.d.ts` file.
