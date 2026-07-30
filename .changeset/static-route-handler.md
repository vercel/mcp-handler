---
"mcp-handler": patch
---

Reject browser requests from unexpected Origin hostnames by default, add `allowedOriginHostnames` for explicit cross-origin access, preserve the HTTP `Allow: POST` header on stateless `405` responses, and isolate synchronous or asynchronous `onEvent` callback failures from MCP requests.

The CLI now supports `src/app`, `--no-install`, and refuses to overwrite an existing route. The published package now includes the documentation linked from the npm README and points its CommonJS declaration export at the generated `dist/index.d.ts` file.
