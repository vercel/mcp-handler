import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types";
import { withAuthContext } from "./auth-context";

export function withMcpAuth(
  handler: (req: Request) => Response | Promise<Response>,
  verifyToken: (
    req: Request,
    bearerToken?: string
  ) => AuthInfo | undefined | Promise<AuthInfo | undefined>,
  {
    required = false,
    oauthResourcePath = "/.well-known/oauth-protected-resource",
  }: {
    required?: boolean;
    oauthResourcePath?: string;
  } = {}
) {
  return async (req: Request) => {
    const origin = new URL(req.url).origin;

    const authHeader = req.headers.get("Authorization");
    const [type, token] = authHeader?.split(" ") || [];

    const bearerToken = type?.toLowerCase() === "bearer" ? token : undefined;
    const authInfo = await verifyToken(req, bearerToken);

    if (required && !authInfo) {
      return new Response(
        JSON.stringify({
          error: "unauthorized_client",
          error_description: "No authorization provided",
        }),
        {
          status: 401,
          headers: {
            "WWW-Authenticate": `Bearer resource_metadata=${origin}${oauthResourcePath}`,
          },
        }
      );
    }

    if (!authInfo) {
      return handler(req);
    }

    if (authInfo.expiresAt && authInfo.expiresAt < Date.now() / 1000) {
      return new Response(
        JSON.stringify({
          error: "invalid_token",
          error_description: "Authorization expired",
        }),
        {
          status: 401,
          headers: {
            "WWW-Authenticate": `Bearer error="invalid_token", error_description="Authorization expired", resource_metadata=${origin}${oauthResourcePath}`,
          },
        }
      );
    }
    return withAuthContext(authInfo, () => handler(req));
  };
}
