# Examples Index

Complete guide to all widget API examples. Choose the example that fits your use case.

## 🎯 Quick Decision Tree

**"I'm completely new to this"**  
→ Start with [Simple Widget Demo](#1-simple-widget-demo)

**"I want to see all the features"**  
→ Check out [Builder Pattern Demo](#2-builder-pattern-demo)

**"I need production-ready code"**  
→ Copy [Next.js Ready Example](#3-nextjs-ready-example)

**"Show me the time savings"**  
→ Read [Before & After Comparison](#4-before--after-comparison)

**"I need the complete reference"**  
→ View [Complete Widget Collection](#5-complete-widget-collection)

---

## 📚 All Examples

### 1. Simple Widget Demo

**File:** `simple-widget-demo.ts`  
**Level:** Beginner  
**Lines:** ~80  
**Time to understand:** 5 minutes

**What's included:**
- ✅ Single greeting widget
- ✅ Basic HTML with inline styles
- ✅ Input schema with Zod
- ✅ Structured content
- ✅ Custom metadata

**Best for:**
- First-time users
- Learning the basics
- Understanding the core API

**Key concepts:**
```typescript
experimental_createWidget({
  id: "widget_id",
  title: "Title",
  description: "Description",
  html: "...",
  inputSchema: { /* zod schemas */ },
  handler: async (input) => ({ /* response */ }),
})
```

**Run it:**
```bash
# Copy to your Next.js app
cp node_modules/mcp-handler/examples/simple-widget-demo.ts app/api/mcp/route.ts
npm run dev
```

---

### 2. Builder Pattern Demo

**File:** `builder-pattern-demo.ts`  
**Level:** Intermediate  
**Lines:** ~200  
**Time to understand:** 15 minutes

**What's included:**
- ✅ 3 different widgets (task board, counter, analytics)
- ✅ Fluent builder API (`.withBorder()`, etc.)
- ✅ `experimental_createWidgetResponse` helper
- ✅ Async HTML loading
- ✅ CSP configuration
- ✅ Complex layouts

**Best for:**
- Learning advanced features
- Multiple widgets in one server
- Production applications

**Key concepts:**
```typescript
experimental_createWidget({ /* ... */ })
  .withBorder()
  .withToolCallsEnabled()
  .withStatusText("Loading...", "Done")
  .withCSP(connects, resources);
```

**Widgets included:**
1. **Task Dashboard** - Kanban board with columns
2. **Counter** - Minimal configuration example
3. **Analytics** - Dynamic HTML with metrics

**Run it:**
```bash
cp node_modules/mcp-handler/examples/builder-pattern-demo.ts app/api/mcp/route.ts
npm run dev
```

---

### 3. Next.js Ready Example

**File:** `nextjs-ready-example.ts`  
**Level:** Beginner to Intermediate  
**Lines:** ~300  
**Time to understand:** 10 minutes

**What's included:**
- ✅ 3 production-ready widgets
- ✅ Beautiful, polished UI
- ✅ Real-world use cases
- ✅ Copy-paste ready
- ✅ Well-commented code

**Best for:**
- Starting a new project
- Demo/prototype
- Learning by example

**Widgets included:**

#### 1. User Profile Card
- Avatar with initials
- Name and role
- Project/commit/review stats
- Gradient background
- Card layout

#### 2. Color Palette Generator
- 4 themes (ocean, sunset, forest, monochrome)
- 5 colors per palette
- Click to copy hex codes
- Grid layout

#### 3. Countdown Timer
- Live countdown (days/hours/minutes/seconds)
- Event name
- Auto-updates every second
- Beautiful gradient design

**Run it:**
```bash
cp node_modules/mcp-handler/examples/nextjs-ready-example.ts app/api/mcp/route.ts
npm run dev
```

**Test with ChatGPT:**
- "Show me Alice's profile"
- "Generate an ocean color palette"
- "Create a countdown to New Year's Day"

---

### 4. Before & After Comparison

**File:** `BEFORE_AFTER.md`  
**Level:** All levels  
**Lines:** N/A (documentation)  
**Time to read:** 10 minutes

**What's included:**
- ✅ Side-by-side code comparison
- ✅ Line count analysis
- ✅ Maintenance comparison
- ✅ Error prevention examples
- ✅ Migration guide

**Best for:**
- Understanding the value proposition
- Convincing your team
- Migration planning

**Key findings:**
- 70% less code
- 100% type safety
- 66% faster development
- Eliminates 6+ common errors

**Read it:**
```bash
cat node_modules/mcp-handler/examples/BEFORE_AFTER.md
```

---

### 5. Complete Widget Collection

**File:** `widget-example.ts`  
**Level:** Advanced  
**Lines:** ~160  
**Time to understand:** 20 minutes

**What's included:**
- ✅ Simple widget
- ✅ Widget with input validation
- ✅ Kanban board with full builder pattern
- ✅ Dynamic HTML loading
- ✅ Regular tool (non-widget)
- ✅ All API features demonstrated

**Best for:**
- Comprehensive reference
- Learning all patterns
- API exploration

**Covers:**
- Basic configuration
- Advanced builder methods
- Async HTML
- CSP
- Widget + regular tool mixing

**Run it:**
```bash
cp node_modules/mcp-handler/examples/widget-example.ts app/api/mcp/route.ts
npm run dev
```

---

## 🎓 Learning Path

### Path 1: Quick Start (30 minutes)

1. Read `QUICKSTART.md` (5 min)
2. Run `simple-widget-demo.ts` (5 min)
3. Modify the demo (10 min)
4. Deploy to Vercel (10 min)

### Path 2: Deep Dive (2 hours)

1. Read `QUICKSTART.md` (5 min)
2. Run `simple-widget-demo.ts` (10 min)
3. Study `builder-pattern-demo.ts` (30 min)
4. Run `nextjs-ready-example.ts` (10 min)
5. Read `/src/widgets/README.md` (30 min)
6. Build your own widget (35 min)

### Path 3: Migration (1 hour)

1. Read `BEFORE_AFTER.md` (10 min)
2. Identify your widget pairs (10 min)
3. Convert one widget (20 min)
4. Test converted widget (10 min)
5. Convert remaining widgets (10 min)

---

## 🔍 Find Example by Feature

### Basic Features

| Feature | Example | File |
|---------|---------|------|
| Simple HTML | ✅ Simple Demo | `simple-widget-demo.ts` |
| Input schema | ✅ All examples | All files |
| Structured content | ✅ All examples | All files |

### Advanced Features

| Feature | Example | File |
|---------|---------|------|
| Builder pattern | ✅ Builder Demo | `builder-pattern-demo.ts` |
| Multiple widgets | ✅ Builder Demo, Next.js Example | `builder-pattern-demo.ts`, `nextjs-ready-example.ts` |
| Async HTML | ✅ Builder Demo | `builder-pattern-demo.ts` |
| Tool calls | ✅ Builder Demo | `builder-pattern-demo.ts` |
| CSP config | ✅ Builder Demo | `builder-pattern-demo.ts` |
| Response helper | ✅ Builder Demo | `builder-pattern-demo.ts` |

### UI Patterns

| Pattern | Example | File |
|---------|---------|------|
| Card layout | ✅ Next.js Example | `nextjs-ready-example.ts` |
| Grid layout | ✅ Next.js Example | `nextjs-ready-example.ts` |
| Gradient backgrounds | ✅ All examples | All files |
| Live updates | ✅ Next.js Example (countdown) | `nextjs-ready-example.ts` |
| Interactive elements | ✅ Next.js Example (color palette) | `nextjs-ready-example.ts` |

---

## 📱 Example Use Cases

### Business Applications

**CRM Dashboard** → Use Task Dashboard pattern from `builder-pattern-demo.ts`  
**Analytics Widget** → Use Analytics pattern from `builder-pattern-demo.ts`  
**User Profiles** → Use Profile Card from `nextjs-ready-example.ts`

### Creative Tools

**Color Tools** → Use Color Palette from `nextjs-ready-example.ts`  
**Design Systems** → Combine multiple widgets from `builder-pattern-demo.ts`

### Utilities

**Timers** → Use Countdown from `nextjs-ready-example.ts`  
**Counters** → Use Counter from `builder-pattern-demo.ts`  
**Status Displays** → Use any card-based widget

---

## 🛠️ Quick Copy Commands

```bash
# Simple starter
cp node_modules/mcp-handler/examples/simple-widget-demo.ts app/api/mcp/route.ts

# Production ready
cp node_modules/mcp-handler/examples/nextjs-ready-example.ts app/api/mcp/route.ts

# Advanced features
cp node_modules/mcp-handler/examples/builder-pattern-demo.ts app/api/mcp/route.ts

# Complete reference
cp node_modules/mcp-handler/examples/widget-example.ts app/api/mcp/route.ts
```

---

## 📖 Documentation Files

| File | Purpose | Read time |
|------|---------|-----------|
| `README.md` | Examples overview | 5 min |
| `BEFORE_AFTER.md` | Code comparison | 10 min |
| `INDEX.md` (this file) | Example navigation | 5 min |
| `/src/widgets/README.md` | Complete API docs | 20 min |
| `../QUICKSTART.md` | Getting started | 10 min |
| `../WIDGET_API.md` | API reference | 5 min |

---

## 🎯 Next Steps

1. **Choose an example** from above
2. **Copy to your project**
3. **Run `npm run dev`**
4. **Test with MCP Inspector** or ChatGPT
5. **Customize** for your use case
6. **Deploy** to production

---

## 💡 Tips

- Start simple, add complexity gradually
- Use MCP Inspector for local testing
- Test in ChatGPT before deploying
- Read error messages carefully
- Check browser console for widget errors
- Reference `/src/widgets/README.md` for API details

---

## 🆘 Getting Help

1. Check the troubleshooting sections in:
   - `/src/widgets/README.md`
   - `../QUICKSTART.md`
   - Example READMEs

2. Review example code comments

3. Open a GitHub issue with:
   - Your code
   - Expected vs actual behavior
   - Error messages

Happy coding! 🚀
