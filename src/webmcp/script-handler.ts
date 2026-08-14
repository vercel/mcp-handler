/**
 * Options for the WebMCP bridge script endpoint.
 */
export type WebMcpScriptHandlerOptions = {
  /**
   * URL of the MCP endpoint the script talks to. May be a path relative to
   * the page origin ("/api/mcp") or an absolute URL.
   */
  endpoint: string;
  /**
   * Explicit allowlist of tool names exposed to in-page agents. Tools not
   * listed here are never registered with the browser, even though they
   * remain reachable through the MCP endpoint itself.
   */
  tools: string[];
  /**
   * Credentials mode for the tool-call fetches issued from the page.
   * @default "same-origin"
   */
  credentials?: "same-origin" | "include" | "omit";
  /**
   * Value served in the script response's Cache-Control header.
   * @default "public, max-age=300"
   */
  cacheControl?: string;
};

type ScriptConfig = {
  endpoint: string;
  tools: string[];
  credentials: string;
};

/**
 * Returns a Web-standard handler that serves a small browser script. When
 * loaded in a page, the script lists the tools of the MCP endpoint, filters
 * them down to the configured allowlist, and registers each one with the
 * page's WebMCP provider (`navigator.modelContext` / `document.modelContext`)
 * so in-page agents can call them. Tool calls run through `fetch` and carry
 * the user's session according to the configured credentials mode.
 *
 * WebMCP is an early-stage W3C proposal; in browsers without a provider (or
 * polyfill) the script is a no-op.
 */
export function createWebMcpScriptHandler(
  options: WebMcpScriptHandlerOptions,
): (req: Request) => Response {
  const {
    endpoint,
    tools,
    credentials = "same-origin",
    cacheControl = "public, max-age=300",
  } = options;

  if (typeof endpoint !== "string" || endpoint.length === 0) {
    throw new Error("createWebMcpScriptHandler: `endpoint` is required");
  }
  if (
    !Array.isArray(tools) ||
    tools.some((name) => typeof name !== "string" || name.length === 0)
  ) {
    throw new Error(
      "createWebMcpScriptHandler: `tools` must be an array of tool names — only allowlisted tools are exposed to the web",
    );
  }

  const script = buildScript({ endpoint, tools, credentials });
  const headers = {
    "content-type": "text/javascript; charset=utf-8",
    "cache-control": cacheControl,
  };

  return function webMcpScriptHandler(req: Request): Response {
    if (req.method === "HEAD") {
      return new Response(null, { status: 200, headers });
    }
    if (req.method !== "GET") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { allow: "GET, HEAD" },
      });
    }
    return new Response(script, { status: 200, headers });
  };
}

function buildScript(config: ScriptConfig): string {
  // "<" is escaped so the config can never terminate an inline <script> tag.
  const configJson = JSON.stringify(config).replace(/</g, "\\u003c");

  return `(() => {
  "use strict";
  const config = ${configJson};
  const provider =
    (typeof navigator !== "undefined" && navigator.modelContext) ||
    (typeof document !== "undefined" && document.modelContext);
  if (!provider || typeof provider.registerTool !== "function") {
    return;
  }

  let protocolVersion = null;
  let requestId = 0;

  async function rpc(method, params, isNotification) {
    const body = { jsonrpc: "2.0", method };
    if (params !== undefined) body.params = params;
    if (!isNotification) body.id = ++requestId;
    const headers = {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    };
    if (protocolVersion) headers["mcp-protocol-version"] = protocolVersion;
    const res = await fetch(config.endpoint, {
      method: "POST",
      credentials: config.credentials,
      headers,
      body: JSON.stringify(body),
    });
    if (isNotification) return null;
    if (!res.ok) {
      throw new Error("MCP request failed: HTTP " + res.status);
    }
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("text/event-stream")) {
      return parseSse(await res.text(), body.id);
    }
    return unwrap(await res.json(), body.id);
  }

  function parseSse(text, id) {
    for (const event of text.split(/\\r?\\n\\r?\\n/)) {
      const data = event
        .split(/\\r?\\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).replace(/^ /, ""))
        .join("\\n");
      if (!data) continue;
      let message;
      try {
        message = JSON.parse(data);
      } catch {
        continue;
      }
      if (
        message &&
        message.id === id &&
        ("result" in message || "error" in message)
      ) {
        return unwrap(message, id);
      }
    }
    throw new Error("No MCP response found in event stream");
  }

  function unwrap(message, id) {
    if (message && message.error) {
      throw new Error(
        message.error.message || "MCP error " + message.error.code,
      );
    }
    if (!message || message.id !== id) {
      throw new Error("Unexpected MCP response");
    }
    return message.result;
  }

  (async () => {
    const init = await rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "mcp-handler/webmcp", version: "1.0.0" },
    });
    protocolVersion = (init && init.protocolVersion) || "2025-06-18";
    await rpc("notifications/initialized", undefined, true).catch(() => null);

    const listed = await rpc("tools/list", {});
    for (const tool of (listed && listed.tools) || []) {
      if (!config.tools.includes(tool.name)) continue;
      provider.registerTool({
        name: tool.name,
        description: tool.description || tool.title || "",
        inputSchema: tool.inputSchema,
        execute: (args) =>
          rpc("tools/call", { name: tool.name, arguments: args || {} }),
      });
    }
  })().catch((error) => {
    console.warn("[mcp-handler/webmcp] failed to register tools:", error);
  });
})();
`;
}
