---
"mcp-handler": patch
---

Add an experimental `experimental_webMcp` option to `createMcpHandler`, which serves a browser bridge from the existing MCP route and registers an explicit allowlist of the endpoint's tools with the page's WebMCP provider (`navigator.modelContext` / `document.modelContext`).
