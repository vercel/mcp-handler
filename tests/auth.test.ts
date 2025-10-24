import { describe, it, expect } from "vitest";
import { protectedResourceHandler } from "../src/index";
import { createInsufficientScopeResponse } from "../src/auth/scope-validator";

describe("auth", () => {
  describe("resource metadata URL to resource identifier mapping", () => {
    const handler = protectedResourceHandler({
      authServerUrls: ["https://auth-server.com"],
    });

    const testCases = [
      // Default well-known URI suffix (oauth-protected-resource)
      {
        resourceMetadata:
          "https://resource-server.com/.well-known/oauth-protected-resource",
        resource: "https://resource-server.com",
      },
      {
        resourceMetadata:
          "https://resource-server.com/.well-known/oauth-protected-resource/my-resource",
        resource: "https://resource-server.com/my-resource",
      },
      {
        resourceMetadata:
          "https://resource-server.com/.well-known/oauth-protected-resource/foo/bar",
        resource: "https://resource-server.com/foo/bar",
      },
      // Ensure ports work
      {
        resourceMetadata:
          "https://resource-server.com:8443/.well-known/oauth-protected-resource",
        resource: "https://resource-server.com:8443",
      },
      // Example well-known URI suffix from RFC 9728 (example-protected-resource)
      {
        resourceMetadata:
          "https://resource-server.com/.well-known/example-protected-resource",
        resource: "https://resource-server.com",
      },
      {
        resourceMetadata:
          "https://resource-server.com/.well-known/example-protected-resource/my-resource",
        resource: "https://resource-server.com/my-resource",
      },
    ] as const;

    testCases.forEach((testCase) => {
      it(`${testCase.resourceMetadata} → ${testCase.resource}`, async () => {
        const req = new Request(testCase.resourceMetadata);
        const res = handler(req);
        const json = await res.json();
        expect(json.resource).toBe(testCase.resource);
      });
    });
  });

  describe("MCP spec compliance for insufficient scope responses", () => {
    it("should create proper WWW-Authenticate header for insufficient scope", () => {
      const missingScopes = ["delete:admin"];
      const availableScopes = ["roll:dice", "read:profile"];
      const resourceMetadataUrl =
        "https://example.com/.well-known/oauth-protected-resource";
      const toolName = "admin_delete";

      const response = createInsufficientScopeResponse(
        missingScopes,
        availableScopes,
        resourceMetadataUrl,
        toolName
      );

      expect(response.statusCode).toBe(403);
      expect(response.headers["Content-Type"]).toBe("application/json");

      const wwwAuth = response.headers["WWW-Authenticate"];
      expect(wwwAuth).toContain('error="insufficient_scope"');
      expect(wwwAuth).toContain('scope="roll:dice read:profile delete:admin"');
      expect(wwwAuth).toContain(`resource_metadata="${resourceMetadataUrl}"`);
      expect(wwwAuth).toContain("error_description=");

      // Verify JSON-RPC response format
      const body = JSON.parse(response.body);
      expect(body.jsonrpc).toBe("2.0");
      expect(body.error.code).toBe(-32003);
      expect(body.error.message).toContain("Additional permissions required");
      expect(body.error.message).toContain("admin_delete");
      expect(body.error.message).toContain("delete:admin");
    });

    it("should include all relevant scopes in scope parameter", () => {
      const missingScopes = ["write:data", "delete:admin"];
      const availableScopes = ["roll:dice", "read:profile"];
      const resourceMetadataUrl =
        "https://example.com/.well-known/oauth-protected-resource";
      const toolName = "multi_scope_tool";

      const response = createInsufficientScopeResponse(
        missingScopes,
        availableScopes,
        resourceMetadataUrl,
        toolName
      );

      const wwwAuth = response.headers["WWW-Authenticate"];
      const scopeMatch = wwwAuth.match(/scope="([^"]+)"/);
      expect(scopeMatch).toBeTruthy();

      const scopes = scopeMatch![1].split(" ");
      expect(scopes).toContain("roll:dice");
      expect(scopes).toContain("read:profile");
      expect(scopes).toContain("write:data");
      expect(scopes).toContain("delete:admin");

      // Should not have duplicates
      expect(scopes.length).toBe(new Set(scopes).size);
    });

    it("should handle empty available scopes", () => {
      const missingScopes = ["delete:admin"];
      const availableScopes: string[] = [];
      const resourceMetadataUrl =
        "https://example.com/.well-known/oauth-protected-resource";
      const toolName = "admin_delete";

      const response = createInsufficientScopeResponse(
        missingScopes,
        availableScopes,
        resourceMetadataUrl,
        toolName
      );

      const wwwAuth = response.headers["WWW-Authenticate"];
      expect(wwwAuth).toContain('scope="delete:admin"');
    });

    it("should create proper error description", () => {
      const missingScopes = ["delete:admin", "write:data"];
      const availableScopes = ["roll:dice"];
      const resourceMetadataUrl =
        "https://example.com/.well-known/oauth-protected-resource";
      const toolName = "admin_tool";

      const response = createInsufficientScopeResponse(
        missingScopes,
        availableScopes,
        resourceMetadataUrl,
        toolName
      );

      const body = JSON.parse(response.body);
      expect(body.error.message).toBe(
        "Additional permissions required for tool 'admin_tool'. Missing: delete:admin, write:data"
      );
    });
  });
});
