import { describe, it, expect, beforeEach, vi } from "vitest";
import { validateToolScope } from "../src/auth/scope-validator";
import { withAuthContext } from "../src/auth/auth-context";

describe("scope validation", () => {
  const mockAuthInfo = {
    token: "test-token",
    scopes: ["roll:dice", "read:profile"],
    clientId: "test-client",
  };

  const mockToolScopes = {
    roll_dice: ["roll:dice"],
    admin_delete: ["delete:admin"],
    user_profile: ["read:profile"],
    no_scopes_tool: [],
  };

  beforeEach(() => {
    // Clear any existing auth context
    vi.clearAllMocks();
  });

  describe("validateToolScope", () => {
    it("should return valid for tools with sufficient scopes", () => {
      const result = withAuthContext(mockAuthInfo, mockToolScopes, () => {
        return validateToolScope("roll_dice");
      });

      expect(result.valid).toBe(true);
    });

    it("should return valid for tools with no scope requirements", () => {
      const result = withAuthContext(mockAuthInfo, mockToolScopes, () => {
        return validateToolScope("no_scopes_tool");
      });

      expect(result.valid).toBe(true);
    });

    it("should return valid for unknown tools", () => {
      const result = withAuthContext(mockAuthInfo, mockToolScopes, () => {
        return validateToolScope("unknown_tool");
      });

      expect(result.valid).toBe(true);
    });

    it("should return invalid for tools with insufficient scopes", () => {
      const result = withAuthContext(mockAuthInfo, mockToolScopes, () => {
        return validateToolScope("admin_delete");
      });

      expect(result.valid).toBe(false);
      expect(result.missingScopes).toEqual(["delete:admin"]);
      expect(result.availableScopes).toEqual(["roll:dice", "read:profile"]);
      expect(result.requiredScopes).toEqual(["delete:admin"]);
    });

    it("should return valid when no auth context is provided", () => {
      const result = validateToolScope("admin_delete");

      expect(result.valid).toBe(true);
    });

    it("should return valid when no tool scopes are provided", () => {
      const result = withAuthContext(mockAuthInfo, undefined, () => {
        return validateToolScope("admin_delete");
      });

      expect(result.valid).toBe(true);
    });

    it("should handle multiple missing scopes", () => {
      const authInfoWithMultipleScopes = {
        ...mockAuthInfo,
        scopes: ["roll:dice"],
      };

      const toolScopesWithMultiple = {
        ...mockToolScopes,
        multi_scope_tool: ["delete:admin", "write:data"],
      };

      const result = withAuthContext(
        authInfoWithMultipleScopes,
        toolScopesWithMultiple,
        () => {
          return validateToolScope("multi_scope_tool");
        }
      );

      expect(result.valid).toBe(false);
      expect(result.missingScopes).toEqual(["delete:admin", "write:data"]);
      expect(result.availableScopes).toEqual(["roll:dice"]);
      expect(result.requiredScopes).toEqual(["delete:admin", "write:data"]);
    });

    it("should handle partial scope matches", () => {
      const authInfoWithPartialScopes = {
        ...mockAuthInfo,
        scopes: ["roll:dice", "delete:admin"],
      };

      const toolScopesWithMultiple = {
        ...mockToolScopes,
        multi_scope_tool: ["delete:admin", "write:data"],
      };

      const result = withAuthContext(
        authInfoWithPartialScopes,
        toolScopesWithMultiple,
        () => {
          return validateToolScope("multi_scope_tool");
        }
      );

      expect(result.valid).toBe(false);
      expect(result.missingScopes).toEqual(["write:data"]);
      expect(result.availableScopes).toEqual(["roll:dice", "delete:admin"]);
      expect(result.requiredScopes).toEqual(["delete:admin", "write:data"]);
    });
  });
});
