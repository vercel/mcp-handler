import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { z } from "zod";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createMcpHandler } from "../src/index";
import { createWebMcpScriptHandler } from "../src/webmcp";
import { nodeToWebHandler } from "./helpers";

type RegisteredTool = {
  name: string;
  description: string;
  inputSchema: unknown;
  execute: (args: unknown) => Promise<unknown>;
};

describe("createWebMcpScriptHandler", () => {
  it("serves the bridge script with the embedded allowlist", async () => {
    const handler = createWebMcpScriptHandler({
      endpoint: "/api/mcp",
      tools: ["echo"],
    });
    const res = handler(new Request("http://localhost/webmcp.js"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(
      "text/javascript; charset=utf-8",
    );
    const script = await res.text();
    expect(script).toContain('"endpoint":"/api/mcp"');
    expect(script).toContain('"tools":["echo"]');
    expect(script).toContain('"credentials":"same-origin"');
  });

  it("escapes config so it cannot break out of an inline script tag", async () => {
    const handler = createWebMcpScriptHandler({
      endpoint: "/api/mcp",
      tools: ["</script><script>alert(1)</script>"],
    });
    const script = await handler(
      new Request("http://localhost/webmcp.js"),
    ).text();
    expect(script).not.toContain("</script>");
  });

  it("rejects non-GET requests", () => {
    const handler = createWebMcpScriptHandler({
      endpoint: "/api/mcp",
      tools: [],
    });
    const res = handler(
      new Request("http://localhost/webmcp.js", { method: "POST" }),
    );
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET, HEAD");
  });

  it("requires an explicit tools allowlist", () => {
    expect(() =>
      createWebMcpScriptHandler({ endpoint: "/api/mcp" } as never),
    ).toThrow("`tools` must be an array of tool names");
    expect(() =>
      createWebMcpScriptHandler({ tools: ["echo"] } as never),
    ).toThrow("`endpoint` is required");
  });
});

describe("webmcp bridge e2e", () => {
  let server: Server;
  let endpoint: string;

  beforeEach(async () => {
    const mcpHandler = createMcpHandler((server) => {
      server.registerTool(
        "echo",
        {
          description: "Echo a message",
          inputSchema: z.object({ message: z.string() }),
        },
        async ({ message }) => ({
          content: [{ type: "text", text: `Tool echo: ${message}` }],
        }),
      );
      server.registerTool(
        "secret",
        {
          description: "Not for the web",
          inputSchema: z.object({}),
        },
        async () => ({ content: [{ type: "text", text: "secret" }] }),
      );
    });

    server = createServer(nodeToWebHandler(mcpHandler));
    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });
    const port = (server.address() as AddressInfo | null)?.port;
    endpoint = `http://localhost:${port}/api/mcp`;
  });

  afterEach(() => {
    server.close();
  });

  async function runBridgeScript(): Promise<RegisteredTool[]> {
    const scriptHandler = createWebMcpScriptHandler({
      endpoint,
      tools: ["echo"],
    });
    const script = await scriptHandler(
      new Request("http://localhost/webmcp.js"),
    ).text();

    const registered: RegisteredTool[] = [];
    const provider = {
      registerTool: (tool: RegisteredTool) => {
        registered.push(tool);
      },
    };
    // Shadow the globals the script feature-detects; fetch stays global.
    new Function("navigator", "document", script)(
      { modelContext: provider },
      undefined,
    );

    await vi.waitFor(() => {
      expect(registered.length).toBeGreaterThan(0);
    });
    return registered;
  }

  it("registers only allowlisted tools with the WebMCP provider", async () => {
    const registered = await runBridgeScript();
    expect(registered).toHaveLength(1);
    expect(registered[0].name).toBe("echo");
    expect(registered[0].description).toBe("Echo a message");
    expect(registered[0].inputSchema).toMatchObject({
      type: "object",
      properties: { message: { type: "string" } },
      required: ["message"],
    });
  });

  it("executes tool calls against the MCP endpoint", async () => {
    const [echo] = await runBridgeScript();
    const result = (await echo.execute({ message: "Are you there?" })) as {
      content: Array<{ type: string; text: string }>;
    };
    expect(result.content[0].text).toBe("Tool echo: Are you there?");
  });

  it("is a no-op when no WebMCP provider exists", async () => {
    const scriptHandler = createWebMcpScriptHandler({
      endpoint,
      tools: ["echo"],
    });
    const script = await scriptHandler(
      new Request("http://localhost/webmcp.js"),
    ).text();
    expect(() =>
      new Function("navigator", "document", script)(undefined, undefined),
    ).not.toThrow();
  });
});
