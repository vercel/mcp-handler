import { createMcpHandler } from 'mcp-handler';

const handler = createMcpHandler(
  server => {
    server.registerTool(
      'echo',
      { description: 'Echo a message' },
      async () => {
        return {
          content: [
            {
              type: 'text',
              text: 'Hello, world!',
            },
          ],
        };
      }
    );
  },
  // Optional: Comes from the McpServer.options
  {},
  // Optional: Comes from the createMcpHandler config
  {
    basePath: '/api/mcp',
    verboseLogs: true,
  }
);

export { handler as GET, handler as POST };
