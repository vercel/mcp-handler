# WebMCP Bridge (experimental)

> **Experimental.** [WebMCP](https://github.com/webmachinelearning/webmcp) is a W3C Web Machine Learning CG proposal under active development. Chrome offers an [origin trial and local testing flag](https://developer.chrome.com/docs/ai/webmcp#get-started). The API and browser availability may change as the proposal evolves.

WebMCP lets a web page expose tools to in-page AI agents through `document.modelContext`. The bridge also supports the older `navigator.modelContext` surface used by some providers. `mcp-handler/webmcp` serves a small script that lists your MCP endpoint's tools and registers an allowlisted subset with the page's WebMCP provider.

Because tool calls run through `fetch` from the page, they carry the user's session cookies — an in-page agent calls your tools *as the signed-in user*, with no OAuth flow.

## Usage

Mount the script endpoint next to your MCP route:

```typescript
// app/webmcp.js/route.ts
import { experimental_createWebMcpScriptHandler } from "mcp-handler/webmcp";

const handler = experimental_createWebMcpScriptHandler({
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

Load any polyfill before the bridge script. For scripts that depend on each other's execution order, use ordered `defer` scripts rather than `async`:

```html
<script src="/your-webmcp-polyfill.js" defer></script>
<script src="/webmcp.js" defer></script>
```

## Compatibility and behavior

- The current [WebMCP API](https://webmachinelearning.github.io/webmcp/) requires a secure context and an origin-isolated document. The `tools` Permissions Policy must allow registration. Cross-origin iframe agents need explicit tool exposure; this bridge uses the default same-origin exposure.
- The bridge targets stateless MCP endpoints with the `2025-06-18` Streamable HTTP protocol, including `mcp-handler`'s compatibility transport. It supports JSON and finite SSE responses, follows tool-list pagination, and does not manage MCP sessions or persistent notification streams.
- Tool registration happens once per script execution. A failed registration (for example, a duplicate tool name) is logged without preventing other tools from registering. The bridge does not replace existing tools or refresh the tool list when application state changes.
- Tool titles and `readOnlyHint` are preserved. If a description is missing, the bridge falls back to the title or name; provide descriptive MCP tool descriptions for useful agent discovery. MCP's other annotations are not automatically equivalent to WebMCP's `untrustedContentHint` or `consequentialHint`.
- Execution forwards the browser's cancellation signal to `fetch`. Cancelling a request does not guarantee cancellation or rollback of server-side work. MCP tool results, including `isError` and error content, are returned unchanged.

## Choosing tools to bridge

Bridge tools that are useful in the current page and can return server results directly. Register client-side tools for actions that must update visible UI, invalidate client caches, ask for confirmation, or follow a component's lifecycle. A successful server tool call does not automatically update the page. See the [WebMCP best practices](https://developer.chrome.com/docs/ai/webmcp/best-practices) for guidance on keeping tools and page state aligned.

For tools that need WebMCP-specific output-trust or consequential-action hints, register them in the page with the appropriate [annotations](https://developer.chrome.com/docs/ai/webmcp/secure-tools#use-annotation-hints), and leave them out of the bridge allowlist.

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

## Hardening

### Gate cookie auth on `Sec-Fetch-Site: same-origin`

For a same-origin MCP endpoint, browsers identify the bridge's tool calls with `Sec-Fetch-Site: same-origin`. If your verifier honors session cookies, reject cookie-authenticated calls from anywhere else while leaving bearer-token clients untouched. Set `required: true` so a rejected or missing session cannot fall through to unauthenticated tool execution:

```typescript
const handler = withMcpAuth(
  mcpHandler,
  async (req, bearerToken) => {
    // Remote MCP clients: OAuth bearer path.
    if (bearerToken) return verifyOAuthToken(bearerToken);

    // WebMCP bridge: only honor cookies for same-origin, browser-issued calls.
    if (req.headers.get("sec-fetch-site") !== "same-origin") return undefined;
    return verifySessionCookie(req);
  },
  { required: true },
);
```

### CSP nonce for the script tag

The bridge is a regular same-origin external script, so under a nonce-based CSP (`script-src 'nonce-...' 'strict-dynamic'`) it needs the nonce on its tag like any other script:

```html
<script src="/webmcp.js" nonce="<your-request-nonce>" async></script>
```

For a same-origin MCP endpoint, `connect-src 'self'` covers the tool calls. An absolute endpoint URL on another origin needs an appropriate CSP and CORS policy; the cookie-auth example above deliberately rejects that configuration.
