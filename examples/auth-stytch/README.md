# MCP Server with Stytch & Next.js

This example demonstrates how to set up a Model Code Protocol (MCP) server endpoint using Next.js and [Stytch](https://stytch.com) for authentication. This integration enables secure authentication for your MCP server, making it ideal for production deployments.

## Features

- 🔒 Secure authentication with Stytch
- ⚡️ Built with Next.js App Router
- 🚀 One-click deployment

## Setup Instructions

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Configure Stytch**
   - Create a new application in your [Stytch Dashboard](https://stytch.com/dashboard)
   - Enable Dynamic Client Registration (DCR) in your [Connected Apps](https://stytch.com/dashboard/connected-apps?env=test)
   - Copy your API keys from the [Project Settings](https://stytch.com/dashboard/project-settings?env=test)

3. **Environment Setup**
   Create a `.env.local` file in the project root with the following variables:
   ```env
   NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN=your_public_token
   STYTCH_SECRET=your_secret_key
   STYTCH_PROJECT_ID=your_project_id
   STYTCH_DOMAIN=your_domain
   ```

4. **Start the Development Server**
   ```bash
   pnpm dev
   ```
   The server will start at `http://localhost:3000`

## Connecting MCP Clients

### Cursor Configuration

To connect Cursor to your MCP server, add the following to your MCP configuration file:

```json
{
  "mcp-stytch-next": {
    "url": "http://localhost:3000/mcp"
  }
}
```

### Other MCP Clients

For other MCP clients, use the endpoint URL: `http://localhost:3000/mcp`

## Deployment

You can deploy your own version of this MCP server to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel/mcp-adapter/tree/main/examples/auth-stytch)
