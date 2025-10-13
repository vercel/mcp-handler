# Widget API (Experimental)

## Overview

The `experimental_createWidget` API provides a unified way to create MCP widgets for the OpenAI Apps SDK. It eliminates ~50 lines of boilerplate by automatically handling resource registration, tool registration, and metadata linking.

## Quick Start

```typescript
import createMcpHandler, { experimental_createWidget } from "mcp-handler";
import { z } from "zod";

const myWidget = experimental_createWidget({
  id: "greeting",
  title: "Greeting",
  description: "Display a greeting",
  html: `
    <script>
      const name = window.openai?.toolOutput?.structuredContent?.name;
      document.body.textContent = 'Hello, ' + name + '!';
    </script>
  `,
  inputSchema: {
    name: z.string(),
  },
  handler: async ({ name }) => ({
    structuredContent: { name },
  }),
});

const handler = createMcpHandler(async (server) => {
  await myWidget.register(server);
});

export { handler as GET, handler as POST };
```

## API

### `experimental_createWidget(config)`

**Config Options:**
- `id` - Unique identifier
- `title` - Human-friendly title
- `description` - Tool description
- `html` - Widget HTML (string or async function)
- `inputSchema` - Zod schema object (e.g., `{ name: z.string() }`)
- `handler` - Async function returning `WidgetResponse`
- `uri` - Optional custom URI (default: `ui://widget/{id}.html`)
- `metadata` - Optional OpenAI metadata

**Metadata Options:**
- `invoking` - Loading text (default: "Loading...")
- `invoked` - Completion text (default: "Loaded")
- `widgetAccessible` - Enable tool calls from widget (default: false)
- `widgetDescription` - Description for model (defaults to description)
- `prefersBorder` - Render with border (default: false)
- `widgetCSP` - Content Security Policy
- `widgetDomain` - Custom subdomain

**Response Format:**
```typescript
{
  structuredContent?: T;  // Data for model + widget
  content?: Array<{ type: "text"; text: string }>; // Optional model text
  _meta?: Record<string, unknown>; // Widget-only data
}
```

### Builder Pattern

```typescript
const widget = experimental_createWidget({ /* ... */ })
  .withBorder()
  .withToolCallsEnabled()
  .withStatusText("Loading...", "Done")
  .withCSP(["https://api.example.com"], ["https://cdn.example.com"])
  .withDomain("chatgpt.com");

await widget.register(server);
```

### `experimental_createWidgetResponse(config)`

Helper for building responses:

```typescript
return experimental_createWidgetResponse({
  structuredContent: { name: "Alice" },
  modelText: "Greeting created",  // Shorthand for content array
  widgetData: { extra: "data" },  // Maps to _meta
});
```

## Examples

See `/examples/widget-example.ts` for comprehensive examples including:
- Simple widgets
- Widgets with input schemas
- Builder pattern usage
- Dynamic HTML loading
- Interactive widgets with tool calls

## Documentation

Full documentation: `/src/widgets/README.md`

## Benefits

- **50+ lines less boilerplate** per widget
- **Type-safe** - Full TypeScript inference
- **Automatic linking** - Resource ↔ Tool connection handled
- **Sensible defaults** - All metadata optional
- **Flexible** - Use simple or advanced patterns
