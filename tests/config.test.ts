import { describe, expect, it } from "vitest";

import { createMcpHandler } from "../src/index";

describe("config", () => {
  it("accepts a streamable HTTP session ID generator", () => {
    const handler = createMcpHandler(
      () => {},
      {},
      {
        sessionIdGenerator: () => "session-id",
      }
    );

    expect(typeof handler).toBe("function");
  });
});
