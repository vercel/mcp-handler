import { describe, expect, it } from "vitest";
import type {
  Config,
  InitializeMcpServer,
  McpEvent,
  ServerOptions,
} from "../src";

describe("public type exports", () => {
  it("exports handler types that consumers can use to compose routes", () => {
    const config: Config = {
      basePath: "/api",
      maxDuration: 60,
      verboseLogs: false,
    };

    const serverOptions: ServerOptions = {
      serverInfo: {
        name: "typed-server",
        version: "1.0.0",
      },
    };

    const initializeServer: InitializeMcpServer = () => undefined;

    const event: McpEvent = {
      type: "SESSION_STARTED",
      timestamp: Date.now(),
      transport: "HTTP",
    };

    expect(config.basePath).toBe("/api");
    expect(serverOptions.serverInfo?.name).toBe("typed-server");
    expect(initializeServer).toBeTypeOf("function");
    expect(event.type).toBe("SESSION_STARTED");
  });
});
