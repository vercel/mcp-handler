# Widget Utilities (Experimental)

> **⚠️ Experimental API**: This API is experimental and may change in future versions.

Unified API for creating MCP widgets compatible with the OpenAI Apps SDK. This module abstracts away the boilerplate of registering both resources and tools with proper linking and metadata.

## Overview

When building MCP servers for OpenAI Apps SDK, you need to:
1. Register a **resource** with HTML content
2. Register a **tool** that references the resource
3. Maintain consistent metadata between both
4. Handle OpenAI-specific metadata fields

This module provides a single API that handles all of this automatically.

## Quick Start

```typescript
import createMcpHandler, { experimental_createWidget } from "mcp-handler";
import { z } from "zod";

const myWidget = experimental_createWidget({
  id: "greeting",
  title: "Greeting Widget",
  description: "Displays a personalized greeting",
  html: `
    <div id="root"></div>
    <script>
      const name = window.openai?.toolOutput?.structuredContent?.name || 'World';
      document.getElementById('root').textContent = 'Hello, ' + name + '!';
    </script>
  `,
  inputSchema: {
    name: z.string().describe("The name to greet"),
  },
  handler: async ({ name }) => ({
    structuredContent: { name },
    content: [{ type: "text", text: `Greeting for ${name}` }],
  }),
});

const handler = createMcpHandler(async (server) => {
  await myWidget.register(server);
});

export { handler as GET, handler as POST };
```

## API Reference

### `experimental_createWidget(config)`

Creates a widget that can be registered with an MCP server.

#### Config Options

```typescript
interface WidgetConfig {
  // Required
  id: string;                    // Unique identifier for the widget/tool
  title: string;                 // Human-friendly title
  description: string;           // Tool description (shown to the model)
  html: string | (() => string | Promise<string>); // Widget HTML content
  handler: (input) => WidgetResponse | Promise<WidgetResponse>;

  // Optional
  uri?: string;                  // Resource URI (default: ui://widget/{id}.html)
  inputSchema?: z.ZodTypeAny;    // Zod schema for input validation
  metadata?: WidgetMetadata;     // OpenAI-specific metadata
}
```

#### Widget Metadata

```typescript
interface WidgetMetadata {
  invoking?: string;              // Loading state text (default: "Loading...")
  invoked?: string;               // Completion state text (default: "Loaded")
  widgetAccessible?: boolean;     // Allow widget to call tools (default: false)
  widgetDescription?: string;     // Description for the model (defaults to description)
  prefersBorder?: boolean;        // Render with border/card layout (default: false)
  widgetCSP?: {                   // Content Security Policy
    connect_domains: string[];
    resource_domains: string[];
  };
  widgetDomain?: string;          // Custom widget subdomain
}
```

#### Response Format

```typescript
interface WidgetResponse<T> {
  structuredContent?: T;          // Data for widget + model
  content?: Array<{               // Optional text for the model
    type: "text";
    text: string;
  }>;
  _meta?: Record<string, unknown>; // Widget-only data (not visible to model)
}
```

### Builder Pattern

Widgets support a fluent builder pattern for configuration:

```typescript
const widget = experimental_createWidget({ /* ... */ })
  .withBorder()                                    // Enable border
  .withToolCallsEnabled()                          // Allow tool calls
  .withStatusText("Loading...", "Done!")          // Set status text
  .withCSP(
    ["https://api.example.com"],                   // connect_domains
    ["https://cdn.example.com"]                    // resource_domains
  )
  .withDomain("chatgpt.com");                      // Custom domain

await widget.register(server);
```

### `experimental_createWidgetResponse(config)`

Helper for creating structured widget responses:

```typescript
import { experimental_createWidgetResponse } from "mcp-handler";

const response = experimental_createWidgetResponse({
  structuredContent: { name: "Alice", timestamp: Date.now() },
  modelText: "Greeting created for Alice",  // Shorthand for content array
  widgetData: { extraInfo: "not visible to model" }, // Maps to _meta
});

// Returns:
// {
//   structuredContent: { name: "Alice", timestamp: 1234567890 },
//   content: [{ type: "text", text: "Greeting created for Alice" }],
//   _meta: { extraInfo: "not visible to model" }
// }
```

## Examples

### Simple Widget

```typescript
const simple = experimental_createWidget({
  id: "simple",
  title: "Simple Widget",
  description: "A minimal widget",
  html: "<div>Hello World</div>",
  handler: async () => ({
    structuredContent: { message: "Hello" },
  }),
});
```

### Widget with Input Schema

```typescript
const userProfile = experimental_createWidget({
  id: "user_profile",
  title: "User Profile",
  description: "Display user information",
  html: `
    <div id="profile"></div>
    <script>
      const user = window.openai?.toolOutput?.structuredContent;
      document.getElementById('profile').innerHTML =
        '<h1>' + user.name + '</h1>' +
        '<p>' + user.email + '</p>';
    </script>
  `,
  inputSchema: {
    userId: z.string().uuid(),
  },
  metadata: {
    prefersBorder: true,
    invoking: "Loading profile...",
    invoked: "Profile loaded",
  },
  handler: async ({ userId }) => {
    const user = await fetchUser(userId);
    return {
      structuredContent: {
        name: user.name,
        email: user.email,
      },
      content: [{ type: "text", text: `Profile for ${user.name}` }],
      _meta: {
        fullUserData: user, // Not visible to model
      },
    };
  },
});
```

### Dynamic HTML Loading

```typescript
const dynamic = experimental_createWidget({
  id: "dynamic",
  title: "Dynamic Widget",
  description: "Widget with async HTML",
  html: async () => {
    // Load from CDN, file system, or build process
    const response = await fetch("https://cdn.example.com/widget.html");
    return response.text();
  },
  handler: async () => ({
    structuredContent: { loaded: true },
  }),
});
```

### Interactive Widget with Tool Calls

```typescript
const interactive = experimental_createWidget({
  id: "task_board",
  title: "Task Board",
  description: "Interactive task management",
  html: `
    <div id="board"></div>
    <script>
      // Widget can call back to the MCP server
      async function updateTask(taskId, status) {
        await window.openai?.callTool('update_task', { taskId, status });
      }
    </script>
  `,
  inputSchema: {
    projectId: z.string(),
  },
  handler: async ({ projectId }) => {
    const tasks = await loadTasks(projectId);
    return {
      structuredContent: { tasks },
    };
  },
})
.withToolCallsEnabled(); // Required for widget-initiated tool calls
```

## Best Practices

### Structured Content vs _meta

- **`structuredContent`**: Data the **model should see** and reason about
- **`_meta`**: Data **only for the widget**, not visible to the model

```typescript
handler: async ({ userId }) => ({
  structuredContent: {
    name: "Alice",           // Model sees this
    role: "Engineer",        // Model sees this
  },
  _meta: {
    internalId: 12345,       // Widget sees this, model doesn't
    permissions: ["read"],   // Widget sees this, model doesn't
  },
})
```

### HTML Structure

The HTML you provide should:
1. Access data via `window.openai.toolOutput.structuredContent`
2. Be self-contained (inline scripts and styles)
3. Handle missing/undefined data gracefully

```typescript
html: `
  <div id="root"></div>
  <style>
    #root { padding: 16px; }
  </style>
  <script>
    const data = window.openai?.toolOutput?.structuredContent;
    const root = document.getElementById('root');

    if (data) {
      root.textContent = data.message;
    } else {
      root.textContent = 'No data available';
    }
  </script>
`
```

### Status Messages

Provide clear, concise status messages for better UX:

```typescript
metadata: {
  invoking: "Fetching latest data...",  // Active/progressive
  invoked: "Data updated",              // Past tense
}
```

## TypeScript Support

Full TypeScript inference for input schemas and structured content:

```typescript
const widget = experimental_createWidget({
  inputSchema: {
    name: z.string(),
    age: z.number(),
  },
  handler: async (input) => {
    // `input` is fully typed: { name: string; age: number }
    return {
      structuredContent: {
        message: `${input.name} is ${input.age}`,
      },
    };
  },
});
```

## Migration from Manual Registration

**Before** (manual registration):

```typescript
server.registerResource("widget", "ui://widget/my.html", {}, async () => ({
  contents: [{
    uri: "ui://widget/my.html",
    mimeType: "text/html+skybridge",
    text: html,
    _meta: { "openai/widgetDescription": "..." },
  }],
}));

server.registerTool("my_tool", {
  title: "My Tool",
  description: "...",
  inputSchema: { ... },
  _meta: {
    "openai/outputTemplate": "ui://widget/my.html",
    "openai/toolInvocation/invoking": "...",
    "openai/toolInvocation/invoked": "...",
  },
}, async (input) => { ... });
```

**After** (with widget helper):

```typescript
const widget = experimental_createWidget({
  id: "my_tool",
  title: "My Tool",
  description: "...",
  html: html,
  inputSchema: { ... },
  handler: async (input) => { ... },
});

await widget.register(server);
```

## Troubleshooting

### Widget not rendering

1. Check that `uri` matches between resource and tool (automatic with this API)
2. Verify HTML is valid and wrapped in `<html>` tags (automatic)
3. Ensure `mimeType` is `text/html+skybridge` (automatic)

### Data not accessible in widget

Access data via `window.openai.toolOutput.structuredContent`:

```javascript
const data = window.openai?.toolOutput?.structuredContent;
```

### Tool calls from widget failing

Enable `widgetAccessible`:

```typescript
.withToolCallsEnabled()
// or
metadata: { widgetAccessible: true }
```

## Learn More

- [OpenAI Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [MCP Server Setup Guide](https://developers.openai.com/apps-sdk/build/mcp-server)
- [Model Context Protocol](https://modelcontextprotocol.io)
