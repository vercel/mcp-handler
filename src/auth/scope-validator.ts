import { getAuthContext, getToolScopes } from "./auth-context";
import { InsufficientScopeError } from "@modelcontextprotocol/sdk/server/auth/errors.js";

/**
 * Validates tool scope requirements
 */
export function validateToolScope(toolName: string): {
  valid: boolean;
  requiredScopes?: string[];
  availableScopes?: string[];
  missingScopes?: string[];
} {
  const authInfo = getAuthContext();
  const toolScopes = getToolScopes();

  if (!authInfo || !toolScopes) {
    return { valid: true };
  }

  const requiredScopes = toolScopes[toolName];

  if (!requiredScopes || requiredScopes.length === 0) {
    return { valid: true };
  }
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
 * Creates insufficient scope error response
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
 * Middleware for tool scope validation
 */
export function createScopeValidationMiddleware() {
  return (req: any, res: any, next: () => void) => {
    if (req.body && typeof req.body === "object" && "method" in req.body) {
      const method = req.body.method;

      if (method === "tools/call" && req.body.params && req.body.params.name) {
        const toolName = req.body.params.name;
        const validation = validateToolScope(toolName);

        if (
          !validation.valid &&
          validation.missingScopes &&
          validation.availableScopes
        ) {
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
