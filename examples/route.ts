import { createMcpHandler } from '../dist/index';

const handler = createMcpHandler(
  server => {
    server.registerTool('echo', {
      title: 'Echo a message',
      description: 'Echo a message',
    }, async () => {
      return {
        content: [
          {
            type: 'text',
            text: 'Hello, world!',
          },
        ],
      };
    });
  },
  // Optional: Comes from the McpServer.options
  {
    capabilities: {},
  },
  // Optional: Comes from the createMcpHandler config
  {
    streamableHttpEndpoint: '/mcp',
    sseEndpoint: '/sse',
    sseMessageEndpoint: '/message',
    basePath: '/api/mcp',
    redisUrl: process.env.REDIS_URL,
  }
);

export { handler as GET, handler as POST };
