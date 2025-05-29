export function withMcpAuth(
  handler: (req: Request) => Promise<Response>,
  verifyToken: (req: Request, token: string) => Promise<boolean>,
  oauthResourcePath = "/.well-known/oauth-protected-resource"
) {
  return async (req: Request) => {
    const origin = new URL(req.url).origin;

    if (!req.headers.get("Authorization")) {
      return new Response(null, {
        status: 401,
        headers: {
          "WWW-Authenticate": `Bearer resource_metadata=${origin}${oauthResourcePath}`,
        },
      });
    }

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      throw new Error(
        `Invalid authorization header value, expected Bearer <token>, received ${authHeader}`
      );
    }

    const isAuthenticated = await verifyToken(req, token);

    if (!isAuthenticated) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "WWW-Authenticate": `Bearer resource_metadata=${origin}${oauthResourcePath}`,
        },
      });
    }

    return handler(req);
  };
}
