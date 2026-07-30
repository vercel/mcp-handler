import { describe, expect, it, vi } from "vitest";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { withMcpAuth } from "../src";

const validAuth: AuthInfo = {
  token: "valid-token",
  clientId: "test-client",
  scopes: ["tools:read", "tools:call"],
};

function request(headers: HeadersInit = {}) {
  return new Request("https://mcp.example/api/mcp", { headers });
}

describe("withMcpAuth", () => {
  it("requires authentication without invoking the MCP handler", async () => {
    const handler = vi.fn(() => new Response("should not run"));
    const verifyToken = vi.fn(() => undefined);
    const protectedHandler = withMcpAuth(handler, verifyToken, {
      required: true,
    });

    const response = await protectedHandler(request());

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain(
      'error="invalid_token"',
    );
    expect(response.headers.get("www-authenticate")).toContain(
      'resource_metadata="https://mcp.example/.well-known/oauth-protected-resource"',
    );
    expect(verifyToken).toHaveBeenCalledWith(expect.any(Request), undefined);
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 403 when a verified token lacks any required scope", async () => {
    const handler = vi.fn(() => new Response("should not run"));
    const protectedHandler = withMcpAuth(handler, () => validAuth, {
      requiredScopes: ["tools:read", "admin"],
    });

    const response = await protectedHandler(
      request({ Authorization: "Bearer valid-token" }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("www-authenticate")).toContain(
      'error="insufficient_scope"',
    );
    expect(response.headers.get("www-authenticate")).toContain(
      'scope="tools:read admin"',
    );
    expect(handler).not.toHaveBeenCalled();
  });

  it("rejects an expired verified token", async () => {
    const handler = vi.fn(() => new Response("should not run"));
    const protectedHandler = withMcpAuth(
      handler,
      () => ({
        ...validAuth,
        expiresAt: Math.floor(Date.now() / 1000) - 1,
      }),
      { required: true },
    );

    const response = await protectedHandler(
      request({ Authorization: "Bearer expired-token" }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain(
      'error_description="Token has expired"',
    );
    expect(handler).not.toHaveBeenCalled();
  });

  it("passes only a valid bearer token and its AuthInfo to the handler", async () => {
    const observed: Array<{ bearerToken?: string; auth?: AuthInfo }> = [];
    const protectedHandler = withMcpAuth(
      (req) => {
        observed.push({ auth: req.auth });
        return new Response("ok");
      },
      (req, bearerToken) => {
        observed.push({ bearerToken, auth: req.auth });
        return validAuth;
      },
      { required: true },
    );

    const response = await protectedHandler(
      request({ Authorization: "bEaReR valid-token" }),
    );

    expect(response.status).toBe(200);
    expect(observed).toEqual([
      { bearerToken: "valid-token", auth: undefined },
      { auth: validAuth },
    ]);
  });
});
