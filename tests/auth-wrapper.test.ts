import { describe, it, expect, vi } from "vitest";
import { withMcpAuth } from "../src/auth/auth-wrapper";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types";

describe("withMcpAuth with requiredToolScopes", () => {
  const mockHandler = vi.fn((req: Request) => {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  const mockVerifyToken = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should pass through requests when no auth is required", async () => {
    const authHandler = withMcpAuth(mockHandler, mockVerifyToken, {
      required: false,
      requiredToolScopes: {
        test_tool: ["test:scope"],
      },
    });

    const req = new Request("https://example.com/test", {
      method: "POST",
      body: JSON.stringify({
        method: "tools/call",
        params: { name: "test_tool" },
      }),
    });

    const response = await authHandler(req);
    expect(response.status).toBe(200);
    expect(mockHandler).toHaveBeenCalledWith(req);
  });

  it("should pass through requests when auth is provided but no tool scopes are defined", async () => {
    mockVerifyToken.mockResolvedValue({
      token: "test-token",
      scopes: ["test:scope"],
      clientId: "test-client",
    });

    const authHandler = withMcpAuth(mockHandler, mockVerifyToken, {
      required: true,
      requiredToolScopes: {
        // No scopes defined for any tools
      },
    });

    const req = new Request("https://example.com/test", {
      method: "POST",
      headers: { Authorization: "Bearer test-token" },
      body: JSON.stringify({
        method: "tools/call",
        params: { name: "test_tool" },
      }),
    });

    const response = await authHandler(req);
    expect(response.status).toBe(200);
    expect(mockHandler).toHaveBeenCalledWith(req);
  });

  it("should return 401 when auth is required but not provided", async () => {
    mockVerifyToken.mockResolvedValue(undefined);

    const authHandler = withMcpAuth(mockHandler, mockVerifyToken, {
      required: true,
      requiredToolScopes: {
        test_tool: ["test:scope"],
      },
    });

    const req = new Request("https://example.com/test", {
      method: "POST",
      body: JSON.stringify({
        method: "tools/call",
        params: { name: "test_tool" },
      }),
    });

    const response = await authHandler(req);
    expect(response.status).toBe(401);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should return 401 when verifyToken throws an error", async () => {
    mockVerifyToken.mockRejectedValue(new Error("Token verification failed"));

    const authHandler = withMcpAuth(mockHandler, mockVerifyToken, {
      required: true,
      requiredToolScopes: {
        test_tool: ["test:scope"],
      },
    });

    const req = new Request("https://example.com/test", {
      method: "POST",
      headers: { Authorization: "Bearer invalid-token" },
      body: JSON.stringify({
        method: "tools/call",
        params: { name: "test_tool" },
      }),
    });

    const response = await authHandler(req);
    expect(response.status).toBe(401);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should return 401 when token is expired", async () => {
    const expiredAuthInfo: AuthInfo = {
      token: "expired-token",
      scopes: ["test:scope"],
      clientId: "test-client",
      expiresAt: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
    };

    mockVerifyToken.mockResolvedValue(expiredAuthInfo);

    const authHandler = withMcpAuth(mockHandler, mockVerifyToken, {
      required: true,
      requiredToolScopes: {
        test_tool: ["test:scope"],
      },
    });

    const req = new Request("https://example.com/test", {
      method: "POST",
      headers: { Authorization: "Bearer expired-token" },
      body: JSON.stringify({
        method: "tools/call",
        params: { name: "test_tool" },
      }),
    });

    const response = await authHandler(req);
    expect(response.status).toBe(401);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should return 403 when required scopes are not met", async () => {
    mockVerifyToken.mockResolvedValue({
      token: "test-token",
      scopes: ["read:data"], // Missing test:scope
      clientId: "test-client",
    });

    const authHandler = withMcpAuth(mockHandler, mockVerifyToken, {
      required: true,
      requiredScopes: ["test:scope"],
      requiredToolScopes: {
        test_tool: ["test:scope"],
      },
    });

    const req = new Request("https://example.com/test", {
      method: "POST",
      headers: { Authorization: "Bearer test-token" },
      body: JSON.stringify({
        method: "tools/call",
        params: { name: "test_tool" },
      }),
    });

    const response = await authHandler(req);
    expect(response.status).toBe(403);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should pass through requests when all required scopes are met", async () => {
    mockVerifyToken.mockResolvedValue({
      token: "test-token",
      scopes: ["test:scope", "read:data"],
      clientId: "test-client",
    });

    const authHandler = withMcpAuth(mockHandler, mockVerifyToken, {
      required: true,
      requiredScopes: ["test:scope"],
      requiredToolScopes: {
        test_tool: ["test:scope"],
      },
    });

    const req = new Request("https://example.com/test", {
      method: "POST",
      headers: { Authorization: "Bearer test-token" },
      body: JSON.stringify({
        method: "tools/call",
        params: { name: "test_tool" },
      }),
    });

    const response = await authHandler(req);
    expect(response.status).toBe(200);
    expect(mockHandler).toHaveBeenCalledWith(req);
  });

  it("should set auth info on request object", async () => {
    const authInfo: AuthInfo = {
      token: "test-token",
      scopes: ["test:scope"],
      clientId: "test-client",
    };

    mockVerifyToken.mockResolvedValue(authInfo);

    const authHandler = withMcpAuth(mockHandler, mockVerifyToken, {
      required: true,
      requiredToolScopes: {
        test_tool: ["test:scope"],
      },
    });

    const req = new Request("https://example.com/test", {
      method: "POST",
      headers: { Authorization: "Bearer test-token" },
      body: JSON.stringify({
        method: "tools/call",
        params: { name: "test_tool" },
      }),
    });

    await authHandler(req);
    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: authInfo,
      })
    );
  });

  it("should include proper WWW-Authenticate header in 401 responses", async () => {
    mockVerifyToken.mockResolvedValue(undefined);

    const authHandler = withMcpAuth(mockHandler, mockVerifyToken, {
      required: true,
      requiredToolScopes: {
        test_tool: ["test:scope"],
      },
    });

    const req = new Request("https://example.com/test", {
      method: "POST",
      body: JSON.stringify({
        method: "tools/call",
        params: { name: "test_tool" },
      }),
    });

    const response = await authHandler(req);
    expect(response.status).toBe(401);

    const wwwAuth = response.headers.get("WWW-Authenticate");
    expect(wwwAuth).toContain('Bearer error="invalid_token"');
    expect(wwwAuth).toContain(
      'resource_metadata="https://example.com/.well-known/oauth-protected-resource"'
    );
  });

  it("should include proper WWW-Authenticate header in 403 responses", async () => {
    mockVerifyToken.mockResolvedValue({
      token: "test-token",
      scopes: ["read:data"], // Missing test:scope
      clientId: "test-client",
    });

    const authHandler = withMcpAuth(mockHandler, mockVerifyToken, {
      required: true,
      requiredScopes: ["test:scope"],
      requiredToolScopes: {
        test_tool: ["test:scope"],
      },
    });

    const req = new Request("https://example.com/test", {
      method: "POST",
      headers: { Authorization: "Bearer test-token" },
      body: JSON.stringify({
        method: "tools/call",
        params: { name: "test_tool" },
      }),
    });

    const response = await authHandler(req);
    expect(response.status).toBe(403);

    const wwwAuth = response.headers.get("WWW-Authenticate");
    expect(wwwAuth).toContain('Bearer error="insufficient_scope"');
    expect(wwwAuth).toContain(
      'resource_metadata="https://example.com/.well-known/oauth-protected-resource"'
    );
  });
});
