
# MCP Server with Clerk & Next.js

This example demonstrates how to set up a Model Code Protocol (MCP) server endpoint using Next.js and [Clerk](https://clerk.com) for authentication. This integration enables secure authentication for your MCP server, making it ideal for production deployments.

## Features

- 🔒 Secure authentication with Clerk
- ⚡️ Built with Next.js App Router
- 🚀 One-click deployment

## Setup Instructions

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Configure Clerk**
   - Create a new application in your [Clerk Dashboard](https://dashboard.clerk.com)
   - Enable Dynamic Client Registration (DCR) in your [OAuth settings](https://dashboard.clerk.com/last-active?path=oauth-applications)
   - Copy your API keys from the [API Keys section](https://dashboard.clerk.com/last-active?path=api-keys)

3. **Environment Setup**
   Create a `.env.local` file in the project root with the following variables:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
   CLERK_SECRET_KEY=your_secret_key
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
  "mcp-clerk-next": {
    "url": "http://localhost:3000/mcp"
  }
}
```

### Other MCP Clients

For other MCP clients, use the endpoint URL: `http://localhost:3000/mcp`

## Deployment

You can deploy your own version of this MCP server to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel/mcp-adapter/tree/main/examples/auth-clerk)