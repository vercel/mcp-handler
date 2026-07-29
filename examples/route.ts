import { createMcpHandler } from "mcp-handler";

const handler = createMcpHandler((server) => {
  server.registerTool("echo", { description: "Echo a message" }, async () => {
    return {
      content: [
        {
          type: "text",
          text: "Hello, world!",
        },
      ],
    };
  });
});

export { handler as GET, handler as POST };
