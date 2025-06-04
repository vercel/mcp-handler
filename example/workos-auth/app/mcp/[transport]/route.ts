import { withAuthkit } from "@/lib/auth";
import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "roll_dice",
      "Rolls an N-sided die",
      {
        sides: z.number().int().min(2),
      },
      async ({ sides }) => {
        const value = 1 + Math.floor(Math.random() * sides);
        return {
          content: [{ type: "text", text: `🎲 You rolled a ${value}!` }],
        };
      }
    );
  },
  {},
  {
    basePath: "/mcp", // this needs to match where the [transport] is located.
    maxDuration: 60,
    verboseLogs: true,
  }
);

const authHandler = withAuthkit(handler);
export { authHandler as GET, authHandler as POST };
