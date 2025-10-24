import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";
import { z } from "zod";
import {
  createServer,
  IncomingMessage,
  ServerResponse,
  type Server,
} from "node:http";
import type { AddressInfo } from "node:net";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createMcpHandler } from "../src/index";
import { withMcpAuth } from "../src/auth/auth-wrapper";

describe("e2e", () => {
  let server: Server;
  let endpoint: string;
  let client: Client;
  let verifyTokenMock: Mock;

  beforeEach(async () => {
    const _mcpHandler = createMcpHandler(
      (server) => {
        server.tool(
          "echo",
          "Echo a message",
          { message: z.string() },
          async ({ message }, extra) => {
            return {
              content: [
                {
                  type: "text",
                  text: `Tool echo: ${message}${
                    extra.authInfo?.token ? ` for ${extra.authInfo?.token}` : ""
                  }`,
                },
              ],
            };
          }
        );
      },
      {
        capabilities: {
          tools: {
            echo: {
              description: "Echo a message",
            },
          },
        },
      },
      {
        redisUrl: process.env.KV_URL,
        basePath: "",
        verboseLogs: true,
        maxDuration: 60,
      }
    );

    verifyTokenMock = vi.fn((req) => {
      const header = req.headers.get("Authorization");
      if (header?.startsWith("Bearer ")) {
        const token = header.slice(7).trim();
        return Promise.resolve({
          token,
          clientId: "client1",
          scopes: ["read:stuff"],
        });
      }
      return undefined;
    });

    const mcpHandler = withMcpAuth(_mcpHandler, verifyTokenMock);

    server = createServer(nodeToWebHandler(mcpHandler));
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        resolve();
      });
    });
    const port = (server.address() as AddressInfo | null)?.port;
    endpoint = `http://localhost:${port}`;

    const transport = new StreamableHTTPClientTransport(
      new URL(`${endpoint}/mcp`)
    );
    client = new Client(
      {
        name: "example-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          prompts: {},
          resources: {},
          tools: {},
        },
      }
    );
    await client.connect(transport);
  });

  afterEach(() => {
    server.close();
  });

  it("should read server capabilities", async () => {
    const capabilities = client.getServerCapabilities();
    expect(capabilities).toBeDefined();
    expect(capabilities?.tools).toBeDefined();
    expect(capabilities?.tools?.echo).toBeDefined();
    expect((capabilities?.tools?.echo as any).description).toEqual(
      "Echo a message"
    );
  });

  it("should list tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.length).toEqual(1);

    const echo = tools.find((tool) => tool.name === "echo");
    expect(echo).toBeDefined();
  });

  it("should call a tool", async () => {
    const result = await client.callTool(
      {
        name: "echo",
        arguments: {
          message: "Are you there?",
        },
      },
      undefined,
      {}
    );
    expect((result.content as any)[0].text).toEqual(
      "Tool echo: Are you there?"
    );
  });

  it("should call a tool with auth", async () => {
    const authenticatedTransport = new StreamableHTTPClientTransport(
      new URL(`${endpoint}/mcp`),
      {
        requestInit: {
          headers: {
            Authorization: `Bearer ACCESS_TOKEN`,
          },
        },
      }
    );
    const authenticatedClient = new Client(
      {
        name: "example-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          prompts: {},
          resources: {},
          tools: {},
        },
      }
    );
    await authenticatedClient.connect(authenticatedTransport);
    const result = await authenticatedClient.callTool(
      {
        name: "echo",
        arguments: {
          message: "Are you there?",
        },
      },
      undefined,
      {}
    );
    expect((result.content as any)[0].text).toEqual(
      "Tool echo: Are you there? for ACCESS_TOKEN"
    );
  });

  it("should return an invalid token error when verifyToken fails", async () => {
    const authenticatedTransport = new StreamableHTTPClientTransport(
      new URL(`${endpoint}/mcp`),
      {
        requestInit: {
          headers: {
            Authorization: `Bearer ACCESS_TOKEN`,
          },
        },
      }
    );
    const authenticatedClient = new Client(
      {
        name: "example-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          prompts: {},
          resources: {},
          tools: {},
        },
      }
    );
    verifyTokenMock.mockImplementation(() => {
      throw new Error("JWT signature failed, or something");
    });

    expect(() =>
      authenticatedClient.connect(authenticatedTransport)
    ).rejects.toThrow("Invalid token");
  });

  describe("scope validation", () => {
    let scopeHandler: (req: Request) => Promise<Response>;
    let scopeServer: Server;
    let scopeEndpoint: string;

    beforeEach(async () => {
      const _scopeHandler = createMcpHandler(
        (server) => {
          server.tool(
            "roll_dice",
            "Rolls an N-sided die",
            { sides: z.number().int().min(2) },
            async ({ sides }) => {
              return {
                content: [{ type: "text", text: `🎲 You rolled a ${sides}!` }],
              };
            }
          );

          server.tool(
            "admin_delete",
            "Admin tool to delete data",
            { id: z.string() },
            async ({ id }) => {
              return {
                content: [
                  {
                    type: "text",
                    text: `🗑️ Deleted item with id: ${id}`,
                  },
                ],
              };
            }
          );

          server.tool(
            "user_profile",
            "Get user profile information",
            { userId: z.string() },
            async ({ userId }) => {
              return {
                content: [
                  {
                    type: "text",
                    text: `👤 Profile for user: ${userId}`,
                  },
                ],
              };
            }
          );
        },
        {
          capabilities: {
            tools: {
              roll_dice: {
                description: "Roll a dice",
              },
              admin_delete: {
                description: "Admin delete operation",
              },
              user_profile: {
                description: "Get user profile",
              },
            },
          },
        },
        {
          redisUrl: process.env.KV_URL,
          basePath: "",
          verboseLogs: true,
          maxDuration: 60,
        }
      );

      const scopeVerifyToken = vi.fn((req) => {
        const header = req.headers.get("Authorization");
        if (header?.startsWith("Bearer ")) {
          const token = header.slice(7).trim();

          if (token === "admin_token") {
            return Promise.resolve({
              token,
              clientId: "admin-client",
              scopes: ["roll:dice", "delete:admin", "read:profile"],
            });
          } else if (token === "user_token") {
            return Promise.resolve({
              token,
              clientId: "user-client",
              scopes: ["roll:dice", "read:profile"],
            });
          }
        }
        return undefined;
      });

      scopeHandler = withMcpAuth(_scopeHandler, scopeVerifyToken, {
        required: true,
        toolScopes: {
          roll_dice: ["roll:dice"],
          admin_delete: ["delete:admin"],
          user_profile: ["read:profile"],
        },
      });

      scopeServer = createServer(nodeToWebHandler(scopeHandler));
      await new Promise<void>((resolve) => {
        scopeServer.listen(0, () => {
          resolve();
        });
      });
      const port = (scopeServer.address() as AddressInfo | null)?.port;
      scopeEndpoint = `http://localhost:${port}`;
    });

    afterEach(() => {
      scopeServer.close();
    });

    it("should allow tool calls with sufficient scopes", async () => {
      const transport = new StreamableHTTPClientTransport(
        new URL(`${scopeEndpoint}/mcp`),
        {
          requestInit: {
            headers: {
              Authorization: `Bearer user_token`,
            },
          },
        }
      );
      const client = new Client(
        {
          name: "test-client",
          version: "1.0.0",
        },
        {
          capabilities: {
            prompts: {},
            resources: {},
            tools: {},
          },
        }
      );
      await client.connect(transport);

      const rollResult = await client.callTool(
        {
          name: "roll_dice",
          arguments: { sides: 6 },
        },
        undefined,
        {}
      );
      expect((rollResult.content as any)[0].text).toContain("🎲");

      const profileResult = await client.callTool(
        {
          name: "user_profile",
          arguments: { userId: "123" },
        },
        undefined,
        {}
      );
      expect((profileResult.content as any)[0].text).toContain("👤");
    });

    it("should return 403 for tool calls with insufficient scopes", async () => {
      const transport = new StreamableHTTPClientTransport(
        new URL(`${scopeEndpoint}/mcp`),
        {
          requestInit: {
            headers: {
              Authorization: `Bearer user_token`,
            },
          },
        }
      );
      const client = new Client(
        {
          name: "test-client",
          version: "1.0.0",
        },
        {
          capabilities: {
            prompts: {},
            resources: {},
            tools: {},
          },
        }
      );
      await client.connect(transport);

      try {
        await client.callTool(
          {
            name: "admin_delete",
            arguments: { id: "123" },
          },
          undefined,
          {}
        );
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toContain("403");
        expect(error.message).toContain("insufficient_scope");
      }
    });

    it("should allow admin operations with admin token", async () => {
      const transport = new StreamableHTTPClientTransport(
        new URL(`${scopeEndpoint}/mcp`),
        {
          requestInit: {
            headers: {
              Authorization: `Bearer admin_token`,
            },
          },
        }
      );
      const client = new Client(
        {
          name: "admin-client",
          version: "1.0.0",
        },
        {
          capabilities: {
            prompts: {},
            resources: {},
            tools: {},
          },
        }
      );
      await client.connect(transport);

      const deleteResult = await client.callTool(
        {
          name: "admin_delete",
          arguments: { id: "123" },
        },
        undefined,
        {}
      );
      expect((deleteResult.content as any)[0].text).toContain("🗑️");
    });
  });
});

function nodeToWebHandler(
  handler: (req: Request) => Promise<Response>
): (req: IncomingMessage, res: ServerResponse) => void {
  return async (req, res) => {
    const method = (req.method || "GET").toUpperCase();
    const requestBody =
      method === "GET" || method === "HEAD"
        ? undefined
        : await new Promise<ArrayBuffer>((resolve, reject) => {
            const chunks: Buffer[] = [];
            req.on("data", (chunk) => {
              chunks.push(chunk);
            });
            req.on("end", () => {
              const buf = Buffer.concat(chunks);
              resolve(
                buf.buffer.slice(
                  buf.byteOffset,
                  buf.byteOffset + buf.byteLength
                )
              );
            });
            req.on("error", () => {
              reject(new Error("Failed to read request body"));
            });
          });

    const requestHeaders = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) {
        continue;
      }
      if (Array.isArray(value)) {
        for (const val of value) {
          requestHeaders.append(key, val);
        }
      } else {
        requestHeaders.append(key, value);
      }
    }

    const reqUrl = new URL(req.url || "/", "http://localhost");
    const webReq = new Request(reqUrl, {
      method: req.method,
      headers: requestHeaders,
      body: requestBody,
    });

    const webResp = await handler(webReq);

    const responseHeaders = Object.fromEntries(webResp.headers);

    res.writeHead(webResp.status, webResp.statusText, responseHeaders);

    if (webResp.body) {
      const arrayBuffer = await webResp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.write(buffer);
    }
    res.end();
  };
}
