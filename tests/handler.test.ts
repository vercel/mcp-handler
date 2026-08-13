import { describe, expect, it } from "vitest";
import { createMcpHandler } from "../src/index";

const PROTOCOL_VERSION = "2026-07-28";

describe("createMcpHandler", () => {
  it("forwards maxSubscriptions to the SDK handler", async () => {
    const handler = createMcpHandler(() => undefined, {
      capabilities: {
        tools: { listChanged: true },
      },
      maxSubscriptions: 0,
    });
    const response = await handler(
      new Request("https://example.com/mcp", {
        method: "POST",
        headers: {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
          "Mcp-Method": "subscriptions/listen",
          "Mcp-Protocol-Version": PROTOCOL_VERSION,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "subscriptions/listen",
          params: {
            notifications: { toolsListChanged: true },
            _meta: {
              "io.modelcontextprotocol/protocolVersion": PROTOCOL_VERSION,
              "io.modelcontextprotocol/clientInfo": {
                name: "test-client",
                version: "1.0.0",
              },
              "io.modelcontextprotocol/clientCapabilities": {},
            },
          },
        }),
      }),
    );
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("text/event-stream")) {
      await response.body?.cancel();
    }

    expect(response.status).toBe(200);
    expect(contentType).toContain("application/json");
    expect(contentType).not.toContain("text/event-stream");
    await expect(response.json()).resolves.toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      error: {
        code: -32603,
        message: "Subscription limit reached",
      },
    });
  });
});
