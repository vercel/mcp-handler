# WebMCP Bridge (experimental)

> **Experimental.** [WebMCP](https://github.com/webmachinelearning/webmcp) is an early-stage W3C Web Machine Learning CG proposal with no shipping browser support yet. This bridge targets polyfills and extension-based agents today, and the API may change as the proposal evolves.

WebMCP lets a web page expose tools to in-page AI agents (browser built-ins, extensions, or iframe-hosted agents) through `navigator.modelContext` / `document.modelContext`. `mcp-handler/webmcp` bridges your server-side MCP tools into that surface: it serves a small script that lists your MCP endpoint's tools and registers an allowlisted subset with the page's WebMCP provider.

Because tool calls run through `fetch` from the page, they carry the user's session cookies — an in-page agent calls your tools *as the signed-in user*, with no OAuth flow.

## Usage

Mount the script endpoint next to your MCP route:

```typescript
// app/webmcp.js/route.ts
import { createWebMcpScriptHandler } from "mcp-handler/webmcp";

const handler = createWebMcpScriptHandler({
  endpoint: "/api/mcp",
  // Only these tools are exposed to in-page agents.
  tools: ["roll_dice", "search_docs"],
});

export { handler as GET };
```

Then include it in your page:

```html
<script src="/webmcp.js" async></script>
```

In a browser (or polyfill) with a WebMCP provider, the script initializes against the MCP endpoint, lists tools, and registers each allowlisted tool with `modelContext.registerTool()`, forwarding `execute` calls to `tools/call`. Without a provider it is a no-op.

## Options

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `endpoint` | yes | — | URL or path of the MCP endpoint the script talks to. |
| `tools` | yes | — | Allowlist of tool names exposed to the page. Tools not listed are never registered. |
| `credentials` | no | `"same-origin"` | Credentials mode for the fetches issued from the page (`"same-origin"`, `"include"`, `"omit"`). |
| `cacheControl` | no | `"public, max-age=300"` | `Cache-Control` header on the script response. |

## Security notes

- **The allowlist is deliberate and required.** Any script or agent in the page can invoke registered tools with the user's credentials, so expose only tools that are safe to call on the user's behalf. Prefer read-only tools; treat side-effectful tools like you would a same-site form submission.
- The allowlist controls what is surfaced to in-page agents — it does not restrict the MCP endpoint itself, which continues to serve its full tool set to regular MCP clients.
- If your MCP endpoint uses `withMcpAuth` with bearer tokens, the bridged calls will be unauthenticated unless your verifier also accepts session cookies. Cookie-session verification is the natural pairing for this bridge.
