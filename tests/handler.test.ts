import { describe, expect, it, vi } from "vitest";
import { createMcpHandler } from "../src";

function legacyInitializeRequest(
  url: string,
  headers: Record<string, string> = {},
) {
  return new Request(url, {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "raw-test-client", version: "1.0.0" },
      },
    }),
  });
}

describe("createMcpHandler HTTP boundary", () => {
  it("rejects a cross-origin browser request before processing MCP", async () => {
    const handler = createMcpHandler(() => {});

    const response = await handler(
      legacyInitializeRequest("http://localhost:3000/custom-mcp", {
        Origin: "https://attacker.example",
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      jsonrpc: "2.0",
      error: {
        code: -32000,
      },
      id: null,
    });
  });

  it("accepts the public request origin and explicitly allowed browser origins", async () => {
    const handler = createMcpHandler(
      () => {},
      {},
      { allowedOriginHostnames: ["app.example"] },
    );

    const sameOriginResponse = await handler(
      legacyInitializeRequest("https://mcp.example/custom", {
        Origin: "https://mcp.example",
      }),
    );
    const configuredOriginResponse = await handler(
      legacyInitializeRequest("https://mcp.example/custom", {
        Origin: "https://app.example",
      }),
    );

    expect(sameOriginResponse.status).toBe(200);
    expect(configuredOriginResponse.status).toBe(200);
  });

  it("rejects POST requests without an application/json media type", async () => {
    const handler = createMcpHandler(() => {});
    const response = await handler(
      new Request("https://mcp.example/custom", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "{}",
      }),
    );

    expect(response.status).toBe(415);
    expect(await response.json()).toMatchObject({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message:
          "Unsupported Media Type: Content-Type must be application/json",
      },
    });
  });

  it("returns a JSON-RPC parse error for malformed JSON", async () => {
    const handler = createMcpHandler(() => {});
    const response = await handler(
      new Request("https://mcp.example/custom", {
        method: "POST",
        headers: {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
        },
        body: '{"jsonrpc":"2.0",',
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      jsonrpc: "2.0",
      error: {
        code: -32700,
        message: expect.stringContaining("Parse error"),
      },
    });
  });

  it.each(["GET", "DELETE"])(
    "returns 405 for stateless legacy %s session operations",
    async (method) => {
      const handler = createMcpHandler(() => {});
      const response = await handler(
        new Request("https://mcp.example/custom", { method }),
      );

      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("POST");
    },
  );

  it("serves the framework mount path even when deprecated route config disagrees", async () => {
    const handler = createMcpHandler(
      () => {},
      {},
      {
        basePath: "/ignored",
        streamableHttpEndpoint: "/also-ignored",
      },
    );

    const response = await handler(
      legacyInitializeRequest("https://mcp.example/anything/the-app-mounts"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
  });
});

describe("createMcpHandler events", () => {
  it("does not fail an MCP request when the analytics callback throws", async () => {
    const handler = createMcpHandler(
      () => {},
      {},
      {
        onEvent: () => {
          throw new Error("analytics backend unavailable");
        },
      },
    );

    const response = await handler(
      legacyInitializeRequest("https://mcp.example/custom"),
    );

    expect(response.status).toBe(200);
  });

  it("does not leave an unhandled rejection when an async analytics callback fails", async () => {
    const handler = createMcpHandler(
      () => {},
      {},
      {
        onEvent: async () => {
          throw new Error("async analytics backend unavailable");
        },
      },
    );

    const response = await handler(
      legacyInitializeRequest("https://mcp.example/custom"),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(response.status).toBe(200);
  });

  it("emits a complete request lifecycle with method, parameters, and duration", async () => {
    const onEvent = vi.fn();
    const handler = createMcpHandler(
      () => {},
      {},
      {
        onEvent,
      },
    );

    const response = await handler(
      legacyInitializeRequest("https://mcp.example/custom"),
    );

    expect(response.status).toBe(200);
    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onEvent.mock.calls[0][0]).toMatchObject({
      type: "REQUEST_RECEIVED",
      method: "initialize",
      parameters: {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
      },
      status: "success",
      timestamp: expect.any(Number),
    });
    expect(onEvent.mock.calls[1][0]).toMatchObject({
      type: "REQUEST_COMPLETED",
      method: "initialize",
      duration: expect.any(Number),
      status: "success",
      timestamp: expect.any(Number),
    });
    expect(onEvent.mock.calls[1][0].duration).toBeGreaterThanOrEqual(0);
  });

  it("reports server initialization failures and marks the request as failed", async () => {
    const onEvent = vi.fn();
    const handler = createMcpHandler(
      () => {
        throw new Error("tool registration failed");
      },
      {},
      {
        onEvent,
      },
    );

    const response = await handler(
      legacyInitializeRequest("https://mcp.example/custom"),
    );

    expect(response.status).toBe(500);
    expect(onEvent.mock.calls.map(([event]) => event.type)).toEqual([
      "REQUEST_RECEIVED",
      "ERROR",
      "REQUEST_COMPLETED",
    ]);
    expect(onEvent.mock.calls[1][0]).toMatchObject({
      type: "ERROR",
      error: expect.objectContaining({
        message: "tool registration failed",
      }),
      source: "request",
      severity: "error",
    });
    expect(onEvent.mock.calls[2][0]).toMatchObject({
      type: "REQUEST_COMPLETED",
      method: "initialize",
      status: "error",
    });
  });
});
