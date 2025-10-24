import { getAuthContext, getToolScopes } from "./auth-context";
import { InsufficientScopeError } from "@modelcontextprotocol/sdk/server/auth/errors.js";

/**
 * Validates that the current auth context has the required scopes for a tool call
 * Returns scope information for proper error response formatting
 */
export function validateToolScope(toolName: string): {
  valid: boolean;
  requiredScopes?: string[];
  availableScopes?: string[];
  missingScopes?: string[];
} {
  const authInfo = getAuthContext();
  const toolScopes = getToolScopes();

  // If no auth context, skip validation
  if (!authInfo || !toolScopes) {
    return { valid: true };
  }

  // Get the required scopes for this tool
  const requiredScopes = toolScopes[toolName];

  // If no scopes are defined for this tool, skip validation
  if (!requiredScopes || requiredScopes.length === 0) {
    return { valid: true };
  }

  // Check if the user has all required scopes
  const hasAllScopes = requiredScopes.every((scope) =>
    authInfo.scopes.includes(scope)
  );

  if (!hasAllScopes) {
    const missingScopes = requiredScopes.filter(
      (scope) => !authInfo.scopes.includes(scope)
    );

    return {
      valid: false,
      requiredScopes,
      availableScopes: authInfo.scopes,
      missingScopes,
    };
  }

  return { valid: true };
}

/**
 * Creates a WWW-Authenticate header for insufficient scope errors
 * Following MCP spec for Scope Challenge Handling
 */
export function createInsufficientScopeResponse(
  missingScopes: string[],
  availableScopes: string[],
  resourceMetadataUrl: string,
  toolName: string
): {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
} {
  // Determine the scope parameter according to MCP spec
  // Include existing relevant scopes and newly required scopes
  const allRelevantScopes = [
    ...new Set([...availableScopes, ...missingScopes]),
  ];
  const scopeParam = allRelevantScopes.join(" ");

  const errorDescription = `Additional permissions required for tool '${toolName}'. Missing: ${missingScopes.join(
    ", "
  )}`;

  const wwwAuthenticateHeader = [
    'Bearer error="insufficient_scope"',
    `scope="${scopeParam}"`,
    `resource_metadata="${resourceMetadataUrl}"`,
    `error_description="${errorDescription}"`,
  ].join(", ");

  return {
    statusCode: 403,
    headers: {
      "WWW-Authenticate": wwwAuthenticateHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32003,
        message: errorDescription,
      },
      id: null,
    }),
  };
}

/**
 * Middleware to validate tool scopes for JSON-RPC requests
 */
export function createScopeValidationMiddleware() {
  return (req: any, res: any, next: () => void) => {
    // Only validate if this is a JSON-RPC request with a method
    if (req.body && typeof req.body === "object" && "method" in req.body) {
      const method = req.body.method;

      // Check if this is a tool call
      if (method === "tools/call" && req.body.params && req.body.params.name) {
        const toolName = req.body.params.name;
        const validation = validateToolScope(toolName);

        if (
          !validation.valid &&
          validation.missingScopes &&
          validation.availableScopes
        ) {
          // Create proper insufficient scope response
          const origin = new URL(req.url).origin;
          const resourceMetadataUrl = `${origin}/.well-known/oauth-protected-resource`;

          const response = createInsufficientScopeResponse(
            validation.missingScopes,
            validation.availableScopes,
            resourceMetadataUrl,
            toolName
          );

          res.statusCode = response.statusCode;
          Object.entries(response.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
          res.end(response.body);
          return;
        }
      }
    }

    next();
  };
}
