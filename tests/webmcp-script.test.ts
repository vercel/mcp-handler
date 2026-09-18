import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import { withMcpAuth } from "../src/index";
import { createWebMcpScriptHandler } from "../src/webmcp/script-handler";

type Tool = {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: object;
  annotations?: { title?: string; readOnlyHint?: boolean };
};
type RegisteredTool = Tool & {
  execute: (
    args: object,
    options?: { signal: AbortSignal },
  ) => Promise<unknown>;
};
type RpcRequest = { id?: number; method: string; params?: { cursor?: string } };

async function runScript({
  tools = [{ name: "echo" }],
  register = async (_tool: RegisteredTool) => {},
  respond,
  navigatorProvider,
}: {
  tools?: Tool[];
  register?: (tool: RegisteredTool) => void | Promise<void>;
  respond?: (
    body: RpcRequest,
    init: RequestInit,
  ) => Response | Promise<Response> | undefined;
  navigatorProvider?: object;
} = {}) {
  const registered: RegisteredTool[] = [];
  const warn = vi.fn();
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string) as RpcRequest;
    const response = await respond?.(body, init);
    if (response) return response;
    if (body.method === "notifications/initialized")
      return new Response(null, { status: 202 });
    return Response.json({
      jsonrpc: "2.0",
      id: body.id,
      result:
        body.method === "initialize"
          ? { protocolVersion: "2025-06-18" }
          : { tools },
    });
  });
  const registerTool = vi.fn(async (tool: RegisteredTool) => {
    if (!tool.description) throw new Error("WebMCP requires a description");
    await register(tool);
    registered.push(tool);
  });
  const script = await createWebMcpScriptHandler({
    endpoint: "/api/mcp",
    tools: tools.map((tool) => tool.name),
  })(new Request("https://example.com/webmcp.js")).text();
  new Function("document", "navigator", "fetch", "console", script)(
    { modelContext: { registerTool } },
    { modelContext: navigatorProvider },
    fetchMock,
    { warn },
  );
  return { registered, registerTool, fetchMock, warn };
}

describe("WebMCP provider contract", () => {
  it("prefers document.modelContext and provides a nonempty description", async () => {
    const legacyRegister = vi.fn();
    const { registered } = await runScript({
      navigatorProvider: { registerTool: legacyRegister },
    });
    await vi.waitFor(() => expect(registered).toHaveLength(1));
    expect(registered[0].description).toBe("echo");
    expect(legacyRegister).not.toHaveBeenCalled();
  });

  it("preserves display titles and explicit read-only hints", async () => {
    const { registered } = await runScript({
      tools: [
        {
          name: "search",
          title: "Search docs",
          annotations: { readOnlyHint: true },
        },
        { name: "write", annotations: { title: "Write a note" } },
      ],
    });
    await vi.waitFor(() => expect(registered).toHaveLength(2));
    expect(registered[0]).toMatchObject({
      title: "Search docs",
      description: "Search docs",
      annotations: { readOnlyHint: true },
    });
    expect(registered[1]).toMatchObject({
      title: "Write a note",
      description: "Write a note",
      annotations: { readOnlyHint: false },
    });
  });

  it.each(["sync", "async"])(
    "continues after a %s registration failure",
    async (mode) => {
      const failure = new Error("Tool already registered");
      const { registered, warn } = await runScript({
        tools: [{ name: "duplicate" }, { name: "echo" }],
        register(tool) {
          if (tool.name !== "duplicate") return;
          if (mode === "sync") throw failure;
          return Promise.reject(failure);
        },
      });
      await vi.waitFor(() => expect(registered).toHaveLength(1));
      expect(registered[0].name).toBe("echo");
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("duplicate"),
        failure,
      );
    },
  );

  it("finds allowlisted tools on later pages without registering other tools", async () => {
    const { registered, fetchMock } = await runScript({
      respond(body) {
        if (body.method !== "tools/list") return;
        return Response.json({
          jsonrpc: "2.0",
          id: body.id,
          result: body.params?.cursor
            ? { tools: [{ name: "echo" }] }
            : { tools: [{ name: "secret" }], nextCursor: "page-2" },
        });
      },
    });
    await vi.waitFor(() => expect(registered).toHaveLength(1));
    expect(registered[0].name).toBe("echo");
    const requests = fetchMock.mock.calls.map(([, init]) =>
      JSON.parse(init.body as string),
    );
    expect(
      requests
        .filter((body) => body.method === "tools/list")
        .map((body) => body.params),
    ).toEqual([{}, { cursor: "page-2" }]);
  });

  it("aborts an in-flight fetch when the browser cancels execution", async () => {
    let signal: AbortSignal | null | undefined;
    const { registered } = await runScript({
      respond(body, init) {
        if (body.method !== "tools/call") return;
        signal = init.signal;
        return new Promise<Response>((_resolve, reject) => {
          signal!.addEventListener("abort", () => reject(signal!.reason), {
            once: true,
          });
        });
      },
    });
    await vi.waitFor(() => expect(registered).toHaveLength(1));
    const controller = new AbortController();
    const result = registered[0].execute({}, { signal: controller.signal });
    const rejected = expect(result).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(signal).toBe(controller.signal);
    controller.abort();
    await rejected;
  });

  it.each(["application/json", "text/event-stream"])(
    "preserves tool error content from %s responses",
    async (contentType) => {
      const result = {
        isError: true,
        content: [{ type: "text", text: "Document does not exist" }],
      };
      const { registered } = await runScript({
        respond(body) {
          if (body.method !== "tools/call") return;
          const message = JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result,
          });
          return new Response(
            contentType === "application/json"
              ? message
              : `event: message\r\ndata: ${message}\r\n\r\n`,
            { headers: { "content-type": contentType } },
          );
        },
      });
      await vi.waitFor(() => expect(registered).toHaveLength(1));
      await expect(registered[0].execute({})).resolves.toEqual(result);
    },
  );
});

describe("documented cookie authentication", () => {
  // Execute the actual recipe so removing required:true from the docs regresses this test.
  const docs = readFileSync(
    new URL("../docs/AUTHORIZATION.md", import.meta.url),
    "utf8",
  );
  const source = docs.match(
    /## Browser session cookies for WebMCP[\s\S]*?```typescript\n([\s\S]*?)\n```/,
  )?.[1];
  if (!source) throw new Error("Cookie-auth documentation example not found");
  const recipe = transpileModule(source, {
    compilerOptions: { module: ModuleKind.None, target: ScriptTarget.ES2022 },
  }).outputText;
  const authInfo = {
    token: "test-session",
    clientId: "browser",
    scopes: ["read:stuff"],
  };

  it.each([
    { site: "same-origin", cookie: "session=valid", bearer: "", status: 200 },
    { site: "same-origin", cookie: "", bearer: "", status: 401 },
    { site: "same-origin", cookie: "session=expired", bearer: "", status: 401 },
    { site: "cross-site", cookie: "session=valid", bearer: "", status: 401 },
    { site: "same-site", cookie: "session=valid", bearer: "", status: 401 },
    { site: "", cookie: "session=valid", bearer: "", status: 401 },
    { site: "", cookie: "", bearer: "valid", status: 200 },
  ])(
    "returns $status for site=$site cookie=$cookie bearer=$bearer",
    async ({ site, cookie, bearer, status }) => {
      const mcpHandler = vi.fn(() => new Response("tool ran"));
      const handler = new Function(
        "withMcpAuth",
        "handler",
        "verifyOAuthToken",
        "verifySession",
        `${recipe}\nreturn authHandler;`,
      )(
        withMcpAuth,
        mcpHandler,
        (token: string) => (token === "valid" ? authInfo : undefined),
        (token: string) => (token === "valid" ? authInfo : undefined),
      );
      const response = await handler(
        new Request("https://example.com/api/mcp", {
          headers: {
            "sec-fetch-site": site,
            cookie,
            ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
          },
        }),
      );
      expect(response.status).toBe(status);
      expect(mcpHandler).toHaveBeenCalledTimes(status === 200 ? 1 : 0);
    },
  );
});
