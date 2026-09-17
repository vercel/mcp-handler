import type { AuthInfo } from "@modelcontextprotocol/server";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";

const SESSION_COOKIE = "session";
const SCOPES = ["read:stuff"];

const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "echo",
      {
        description: "Echo a message",
        inputSchema: z.object({ message: z.string() }),
      },
      async ({ message }, ctx) => ({
        content: [
          {
            type: "text",
            text: `Echo: ${message} for user ${ctx.http?.authInfo?.clientId}`,
          },
        ],
      }),
    );
  },
  {
    experimental_webMcp: {
      tools: ["echo"],
    },
  },
);

function readCookie(req: Request, name: string): string | undefined {
  const prefix = `${name}=`;
  const cookie = req.headers
    .get("cookie")
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));

  return cookie?.slice(prefix.length);
}

async function verifySession(
  sessionToken: string,
): Promise<{ userId: string } | undefined> {
  // Replace this with your application's session lookup.
  if (!sessionToken.startsWith("__TEST_SESSION__")) return undefined;
  return { userId: "user123" };
}

async function verifyBearerToken(
  bearerToken: string,
): Promise<AuthInfo | undefined> {
  // Keep this branch if non-browser MCP clients also use this endpoint.
  if (!bearerToken.startsWith("__TEST_VALUE__")) return undefined;
  return {
    token: bearerToken,
    scopes: SCOPES,
    clientId: "remote-client",
  };
}

const verifyAuth = async (
  req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> => {
  if (bearerToken) return verifyBearerToken(bearerToken);

  // Only accept browser cookies on same-origin requests.
  if (req.headers.get("sec-fetch-site") !== "same-origin") return undefined;

  const sessionToken = readCookie(req, SESSION_COOKIE);
  if (!sessionToken) return undefined;

  const session = await verifySession(sessionToken);
  if (!session) return undefined;

  return {
    token: sessionToken,
    scopes: SCOPES,
    clientId: session.userId,
    extra: { userId: session.userId, authMethod: "cookie" },
  };
};

const authHandler = withMcpAuth(mcpHandler, verifyAuth, {
  required: true,
  requiredScopes: SCOPES,
});

export { authHandler as GET, authHandler as POST };
