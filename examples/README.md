# Widget API Examples

This directory contains examples demonstrating how to use the experimental widget API.

## Examples

### 1. Simple Widget Demo (`simple-widget-demo.ts`)

**What it shows:**
- Basic widget creation with `experimental_createWidget`
- HTML with inline styles
- Input schema with Zod
- Structured content and response handling
- Custom metadata (status text, border preference)

**Use this example for:**
- Getting started quickly
- Understanding the basic API structure
- Creating simple, standalone widgets

**Run it:**
```bash
# In a Next.js app, add to app/api/mcp/route.ts:
import { handler as GET, handler as POST } from './simple-widget-demo';
export { GET, POST };
```

---

### 2. Builder Pattern Demo (`builder-pattern-demo.ts`)

**What it shows:**
- Fluent builder API (`.withBorder()`, `.withToolCallsEnabled()`, etc.)
- Multiple widgets in one handler
- `experimental_createWidgetResponse` helper
- Async HTML loading
- Content Security Policy configuration
- Complex layouts (task dashboard with columns)

**Use this example for:**
- Advanced widget configurations
- Multiple widgets in one MCP server
- Dynamic HTML generation
- CSP and security settings

**Includes 3 widgets:**
1. **Task Dashboard** - Kanban-style board with builder pattern
2. **Counter** - Minimal configuration example
3. **Analytics** - Async HTML loading with CSP

**Run it:**
```bash
# In a Next.js app, add to app/api/mcp/route.ts:
import { handler as GET, handler as POST } from './builder-pattern-demo';
export { GET, POST };
```

---

### 3. Complete Widget Collection (`widget-example.ts`)

**What it shows:**
- Comprehensive examples of all API features
- Various widget patterns (simple, interactive, dynamic)
- Mixing regular tools with widgets
- Real-world use cases

**Includes:**
- Simple widget
- Greeting widget with input validation
- Kanban board with full builder pattern
- Dynamic HTML loading
- Regular (non-widget) tool integration

---

## Quick Comparison

| Feature | Simple Demo | Builder Demo | Complete Collection |
|---------|-------------|--------------|---------------------|
| Basic widget | ✅ | ✅ | ✅ |
| Builder pattern | ❌ | ✅ | ✅ |
| Multiple widgets | ❌ | ✅ | ✅ |
| Async HTML | ❌ | ✅ | ✅ |
| CSP config | ❌ | ✅ | ✅ |
| Tool calls enabled | ❌ | ✅ | ✅ |
| Response helpers | ❌ | ✅ | ❌ |

## Key Concepts

### Structured Content vs _meta

```typescript
handler: async ({ userId }) => ({
  structuredContent: {
    name: "Alice",      // ✅ Model can see and reason about this
    role: "Engineer",   // ✅ Model can see this
  },
  _meta: {
    internalId: 123,    // ❌ Widget only, model can't see
    permissions: [],    // ❌ Widget only, model can't see
  },
})
```

### HTML Data Access

Widgets access data via `window.openai.toolOutput`:

```javascript
const data = window.openai?.toolOutput?.structuredContent;
const meta = window.openai?.toolOutput?._meta;
```

### Builder Pattern

Chain methods for advanced configuration:

```typescript
const widget = experimental_createWidget({ /* ... */ })
  .withBorder()                    // Render with border
  .withToolCallsEnabled()          // Allow widget → server calls
  .withStatusText("...", "...")    // Custom status messages
  .withCSP(connects, resources)    // Security policy
  .withDomain("chatgpt.com");      // Custom subdomain
```

## Next Steps

1. Start with **simple-widget-demo.ts** to understand the basics
2. Move to **builder-pattern-demo.ts** for advanced features
3. Reference **widget-example.ts** for comprehensive patterns
4. Read `/src/widgets/README.md` for full API documentation

## Testing Locally

### With Next.js

1. Copy an example to `app/api/mcp/route.ts`
2. Run `npm run dev` or `pnpm dev`
3. Visit `http://localhost:3000/api/mcp` to see the MCP endpoint
4. Use [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) to test

### With ChatGPT

1. Deploy to a public HTTPS endpoint (Vercel, ngrok, etc.)
2. In ChatGPT, go to **Settings → Connectors → Create**
3. Add your MCP server URL (e.g., `https://your-app.vercel.app/api/mcp`)
4. Test by asking ChatGPT to use your widget

## Common Patterns

### Loading Widget

```typescript
metadata: {
  invoking: "Loading data...",
  invoked: "Data loaded",
}
```

### Interactive Widget

```typescript
experimental_createWidget({ /* ... */ })
  .withToolCallsEnabled()
```

### Secure Widget

```typescript
.withCSP(
  ["https://api.example.com"],  // fetch() allowed
  ["https://cdn.example.com"]   // <script src> allowed
)
```

### Card Layout

```typescript
.withBorder()
```

## Troubleshooting

**Widget not rendering?**
- Check that HTML is valid
- Verify `window.openai.toolOutput` exists in browser console

**Data not showing?**
- Access via `structuredContent` not directly
- Use optional chaining: `window.openai?.toolOutput?.structuredContent`

**Tool calls failing?**
- Enable with `.withToolCallsEnabled()`
- Verify ChatGPT supports widget → server calls

**CSP errors?**
- Configure allowed domains with `.withCSP()`
- Check browser console for blocked requests
