# Client Integration

Guide for connecting to your MCP server from various clients.

## Direct Connection (Recommended)

If your client supports Streamable HTTP, connect directly:

```json
{
  "remote-example": {
    "url": "http://localhost:3000/api/mcp"
  }
}
```

## Using mcp-remote

For clients that only support stdio, use [mcp-remote](https://www.npmjs.com/package/mcp-remote) to proxy Streamable HTTP:

```json
{
  "remote-example": {
    "command": "npx",
    "args": [
      "-y",
      "mcp-remote",
      "http://localhost:3000/api/mcp"
    ]
  }
}
```

## Claude Desktop

[Official Docs](https://modelcontextprotocol.io/quickstart/user)

Edit the configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

If the file doesn't exist, enable it under Settings > Developer.

```json
{
  "remote-example": {
    "command": "npx",
    "args": [
      "-y",
      "mcp-remote",
      "http://localhost:3000/api/mcp"
    ]
  }
}
```

Restart Claude Desktop to pick up changes. You should see a hammer icon in the bottom right corner of the input box.

## Cursor

[Official Docs](https://docs.cursor.com/context/model-context-protocol)

Edit `~/.cursor/mcp.json`.

As of version 0.48.0, Cursor supports unauthed SSE servers directly. If your MCP server uses OAuth authorization, you still need mcp-remote.

## Windsurf

[Official Docs](https://docs.codeium.com/windsurf/mcp)

Edit `~/.codeium/windsurf/mcp_config.json`.

## In-App Usage

Use the MCP client directly in your application:

```typescript
import { McpClient } from "@modelcontextprotocol/sdk/client";

const client = new McpClient({
  transport: new SSEClientTransport("/api/mcp/mcp"),
});

const result = await client.request("yourMethod", { param: "value" });
```
