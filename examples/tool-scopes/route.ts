import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { NextRequest } from "next/server";
import { z } from "zod";

const handler = async (
  req: NextRequest,
  { params }: { params: Promise<{ p: string; transport: string }> }
) => {
  const { p, transport } = await params;

  return createMcpHandler(
    (server) => {
      server.tool(
        "roll_dice",
        "Rolls an N-sided die",
        { sides: z.number().int().min(2) },
        async ({ sides }) => {
          const value = 1 + Math.floor(Math.random() * sides);
          return {
            content: [{ type: "text", text: `🎲 You rolled a ${value}!` }],
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
      redisUrl: process.env.REDIS_URL,
      basePath: `/dynamic/${p}`,
      verboseLogs: true,
      maxDuration: 60,
    }
  )(req);
};

/**
 * Verify the bearer token and return auth information
 */
const verifyToken = async (
  req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;

  // Example token validation logic
  const isValid = bearerToken.startsWith("Bearer__EXAMPLE__");

  if (!isValid) return undefined;

  // Return auth info with different scopes based on token
  if (bearerToken.includes("admin")) {
    return {
      token: bearerToken,
      scopes: ["roll:dice", "delete:admin", "read:profile"],
      clientId: "admin-client",
      extra: {
        userId: "admin-user",
        permissions: ["admin"],
      },
    };
  } else {
    return {
      token: bearerToken,
      scopes: ["roll:dice", "read:profile"], // No admin scopes
      clientId: "regular-client",
      extra: {
        userId: "regular-user",
        permissions: ["user"],
      },
    };
  }
};

// Apply authentication with tool-specific scopes
const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  toolScopes: {
    roll_dice: ["roll:dice"], // Only needs 'roll:dice' scope
    admin_delete: ["delete:admin"], // Requires admin permissions
    user_profile: ["read:profile"], // Only needs 'read:profile' scope
  },
});

export { authHandler as GET, authHandler as POST, authHandler as DELETE };


