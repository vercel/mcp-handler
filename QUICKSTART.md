# Quick Start Guide

Get up and running with the experimental widget API in 5 minutes.

## Installation

```bash
npm install mcp-handler @modelcontextprotocol/sdk zod
# or
pnpm add mcp-handler @modelcontextprotocol/sdk zod
```

## Create Your First Widget (3 steps)

### Step 1: Create the route file

In a Next.js app, create `app/api/mcp/route.ts`:

```typescript
import createMcpHandler, { experimental_createWidget } from "mcp-handler";
import { z } from "zod";

// Create a simple widget
const helloWidget = experimental_createWidget({
  id: "hello_world",
  title: "Hello World",
  description: "A simple greeting widget",

  html: `
    <style>
      body {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        font-family: system-ui;
        font-size: 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        margin: 0;
      }
    </style>
    <div id="greeting"></div>
    <script>
      const name = window.openai?.toolOutput?.structuredContent?.name || 'World';
      document.getElementById('greeting').textContent = 'Hello, ' + name + '! 👋';
    </script>
  `,

  inputSchema: {
    name: z.string().describe("Name to greet"),
  },

  handler: async ({ name }) => ({
    structuredContent: { name },
  }),
});

// Create the MCP handler
const handler = createMcpHandler(async (server) => {
  await helloWidget.register(server);
});

export { handler as GET, handler as POST };
```

### Step 2: Run your app

```bash
npm run dev
# or
pnpm dev
```

### Step 3: Test it

#### Option A: MCP Inspector (Local Testing)

1. Install MCP Inspector:
   ```bash
   npm install -g @modelcontextprotocol/inspector
   ```

2. Run inspector:
   ```bash
   npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp
   ```

3. In the inspector:
   - Click "List Tools"
   - Find "hello_world"
   - Click "Call Tool"
   - Enter `{ "name": "Alice" }`
   - See the widget render!

#### Option B: ChatGPT (Production Testing)

1. Deploy to Vercel:
   ```bash
   vercel deploy
   ```

2. In ChatGPT:
   - Go to Settings → Connectors → Create
   - Add your URL: `https://your-app.vercel.app/api/mcp`
   - Ask: "show me the hello world widget with my name"

## What Just Happened?

The `experimental_createWidget` function:

1. ✅ Registered an MCP **resource** with your HTML
2. ✅ Registered an MCP **tool** that returns structured data
3. ✅ Linked them together with OpenAI metadata
4. ✅ Configured tool invocation status messages
5. ✅ Set up proper MIME types and URIs

**Without the helper, this would be ~50 lines of boilerplate!**

## Next Steps

### Add More Widgets

```typescript
const widget1 = experimental_createWidget({ /* ... */ });
const widget2 = experimental_createWidget({ /* ... */ });

const handler = createMcpHandler(async (server) => {
  await widget1.register(server);
  await widget2.register(server);
});
```

### Use the Builder Pattern

```typescript
const fancyWidget = experimental_createWidget({
  id: "fancy",
  title: "Fancy Widget",
  description: "A widget with all the features",
  html: "...",
  inputSchema: { /* ... */ },
  handler: async () => ({ /* ... */ }),
})
  .withBorder()                // Add border/card layout
  .withToolCallsEnabled()      // Allow widget to call server
  .withStatusText(
    "Loading...",              // While invoking
    "Loaded!"                  // When complete
  );

await fancyWidget.register(server);
```

### Use the Response Helper

```typescript
import { experimental_createWidgetResponse } from "mcp-handler";

handler: async ({ userId }) => {
  const user = await fetchUser(userId);

  return experimental_createWidgetResponse({
    structuredContent: {
      name: user.name,         // Model sees this
      email: user.email,       // Model sees this
    },
    modelText: `Found user ${user.name}`,  // Text for model
    widgetData: {
      internalId: user.id,     // Widget only, model doesn't see
    },
  });
}
```

## Ready-to-Use Examples

We've created complete examples you can copy directly:

### 1. Simple Widget Demo
```bash
cp node_modules/mcp-handler/examples/simple-widget-demo.ts app/api/mcp/route.ts
```

**Contains:**
- Basic greeting widget
- Custom styling
- Input validation
- Structured responses

### 2. Next.js Ready Example
```bash
cp node_modules/mcp-handler/examples/nextjs-ready-example.ts app/api/mcp/route.ts
```

**Contains 3 widgets:**
- 👤 User Profile Card (with stats)
- 🎨 Color Palette Generator (5 themes)
- ⏰ Countdown Timer (live updates)

### 3. Builder Pattern Demo
```bash
cp node_modules/mcp-handler/examples/builder-pattern-demo.ts app/api/mcp/route.ts
```

**Contains:**
- Task dashboard with builder pattern
- Counter widget (minimal config)
- Analytics with async HTML loading
- CSP configuration examples

## Common Patterns

### 1. Loading Data from API

```typescript
handler: async ({ userId }) => {
  const response = await fetch(`https://api.example.com/users/${userId}`);
  const user = await response.json();

  return {
    structuredContent: {
      name: user.name,
      email: user.email,
    },
  };
}
```

### 2. Conditional Rendering

```typescript
html: `
  <script>
    const data = window.openai?.toolOutput?.structuredContent;

    if (data?.error) {
      document.body.innerHTML = '<div class="error">' + data.error + '</div>';
    } else {
      document.body.innerHTML = '<div class="success">' + data.message + '</div>';
    }
  </script>
`
```

### 3. Interactive Elements

```typescript
html: `
  <button onclick="handleClick()">Click me</button>
  <script>
    function handleClick() {
      // Widget can call back to server if .withToolCallsEnabled()
      window.openai?.callTool('some_tool', { action: 'clicked' });
    }
  </script>
`
```

## Troubleshooting

### Widget not showing data?

Make sure you're accessing `window.openai.toolOutput`:

```javascript
// ✅ Correct
const data = window.openai?.toolOutput?.structuredContent;

// ❌ Wrong
const data = window.structuredContent;
```

### Styles not working?

Wrap your CSS in a `<style>` tag inside your HTML:

```typescript
html: `
  <style>
    body { background: blue; }
  </style>
  <div>Content</div>
`
```

### Build errors?

Make sure you have the peer dependencies:

```bash
npm install @modelcontextprotocol/sdk zod
```

## Learn More

- 📖 **Full API Docs**: `/src/widgets/README.md`
- 🎯 **Examples**: `/examples/` directory
- 🔧 **API Reference**: `WIDGET_API.md`
- 🌐 **OpenAI Docs**: https://developers.openai.com/apps-sdk

## Need Help?

Open an issue on GitHub with:
- Your code snippet
- Expected vs actual behavior
- Any error messages

Happy widget building! 🚀
