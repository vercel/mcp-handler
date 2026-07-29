---
"mcp-handler": patch
---

Mount the MCP handler directly at a framework route and remove legacy transport endpoint routing. The CLI now generates `app/api/mcp/route.ts`; deprecated route, SSE, Redis, and session config keys remain accepted as ignored 2.x compatibility shims.
