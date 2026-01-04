# Widget Development Workflow

This document describes the workflow for developing and deploying MCP widgets using Next.js.

## Overview

The workflow allows you to develop widgets as Next.js pages with full React capabilities, then build them as static HTML by fetching from a running Next.js server for serving as MCP resources.

## Architecture

```
┌─────────────────────────────────────────────┐
│ 1. DEVELOPMENT                              │
│ Develop widget at /app/widget/todo/page.tsx│
│ Full Next.js/React dev environment          │
│ Hot reload, TypeScript, Tailwind CSS        │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 2. BUILD                                    │
│ Run: npm run build:widget                  │
│ - Fetches HTML from http://localhost:3000  │
│ - Post-processes with data injection scripts│
│ - Saves to public/todo-widget.html          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 3. SERVE                                    │
│ MCP route loads public/todo-widget.html    │
│ Registers as ui://widget/todo.html         │
│ Tools return data with structuredContent   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 4. RUNTIME                                  │
│ Widget receives data via:                  │
│ - window.openai.toolOutput                 │
│ - window.openai.toolResponseMetadata       │
│ - postMessage events                       │
│ - window.renderTodos() function            │
└─────────────────────────────────────────────┘
```

## Development Workflow

### 1. Start Development Server

```bash
npm run dev
```

Navigate to [http://localhost:3000/widget/todo](http://localhost:3000/widget/todo) to see your widget in development.

### 2. Develop Your Widget

Edit [app/widget/todo/page.tsx](app/widget/todo/page.tsx):

```tsx
'use client';

export default function TodoWidget() {
  // Your React component code
  // Full Next.js features available:
  // - React hooks
  // - Tailwind CSS
  // - TypeScript
  // - Hot reload
}
```

### 3. Build the Widget

Once development is complete, build the static HTML:

```bash
# In one terminal, keep dev server running
npm run dev

# In another terminal, build the widget
npm run build:widget
```

This command:
- Fetches the rendered HTML from `http://localhost:3000/widget/todo`
- Injects data reception scripts for OpenAI ChatGPT integration
- Saves the final HTML to `public/todo-widget.html`

**Note:** The dev server must be running during the build. The script fetches the fully rendered HTML from the running server.

### 4. Test the MCP Resource

The MCP route at `/mcp` automatically loads `public/todo-widget.html` and serves it as a resource.

Test your tools:
- `add_todo` - Adds a todo item
- `complete_todo` - Marks a todo as completed
- `list_todos` - Shows all todos

## File Structure

```
mcp-for-next.js/
├── app/
│   ├── widget/
│   │   └── todo/
│   │       └── page.tsx          # Widget development (Next.js page)
│   └── mcp/
│       └── route.ts               # MCP server route (dynamic)
├── public/
│   └── todo-widget.html           # Built widget (post-processed, committed)
├── scripts/
│   └── build-widget.mjs           # Build script (fetches from server)
├── next.config.ts                 # Next.js config
└── package.json                   # Scripts: build:widget
```

## Data Flow

### Tool Returns Data

```typescript
server.registerTool("add_todo", {...}, async ({ title }) => {
  const todo = { id: `todo-${nextId++}`, title, completed: false };
  todos = [...todos, todo];

  return {
    content: [
      { type: "text", text: `Added "${todo.title}".` },
      {
        type: "text",
        text: `<widget-data>${JSON.stringify({ tasks: todos })}</widget-data>`,
      },
    ],
    structuredContent: { tasks: todos },
    _meta: {
      "openai/widgetData": { tasks: todos },
    },
  };
});
```

### Widget Receives Data

The built HTML includes scripts that check multiple data sources:

1. **window.openai.toolOutput** - Direct OpenAI injection
2. **window.openai.toolResponseMetadata['openai/widgetData']** - Metadata
3. **postMessage events** - Cross-frame communication
4. **window.renderTodos()** - Direct function call

The widget automatically detects and renders data from any of these sources.

## Benefits of This Approach

✅ **Full Dev Experience** - Use Next.js, React, TypeScript, Tailwind CSS
✅ **Simple Build** - Fetch rendered HTML from running server
✅ **Works with Dynamic Routes** - Compatible with MCP API routes
✅ **MCP Compatible** - Follows OpenAI widget patterns from smartcvs-ai-gpt-app
✅ **Separation of Concerns** - Widget UI separate from MCP logic
✅ **Version Control** - Commit both source (page.tsx) and built HTML (todo-widget.html)
✅ **Production Ready** - Built HTML is standalone with all assets inlined

## Adding New Widgets

1. Create a new Next.js page: `app/widget/mywidget/page.tsx`
2. Update `scripts/build-widget.mjs` to add your widget config
3. Register the resource in `app/mcp/route.ts`
4. Run `npm run build:widget`

## Best Practices

### Development

- Keep widgets as **client components** (`'use client'`)
- Expose a global **render function** for data injection
- Test in browser at `/widget/todo` during development
- Use TypeScript interfaces for data shapes

### Building

- Always run `npm run build:widget` before deploying
- Commit both source and built HTML to version control
- Verify the built HTML size (keep under 100KB if possible)

### MCP Integration

- Return data in **three formats**: `content`, `structuredContent`, `_meta`
- Use `openai/widgetData` metadata for widget-specific data
- Set `openai/outputTemplate` to point to your widget URI
- Add `openai/toolInvocation` messages for better UX

## Troubleshooting

### Widget not loading

```bash
# Make sure dev server is running
npm run dev

# In another terminal, rebuild the widget
npm run build:widget

# Check that public/todo-widget.html exists
ls public/todo-widget.html
```

### Data not appearing in widget

Check that tools return data in all three formats:
- `content` array with text
- `structuredContent` object with typed data
- `_meta["openai/widgetData"]` with widget data

### Build script fails

Common issues:
- **Connection refused**: Dev server not running. Start with `npm run dev`
- **Port 3000 in use**: Change port or stop other process
- **Widget page not found**: Ensure `app/widget/todo/page.tsx` exists
- **Permission errors**: Ensure write permissions for `public/` directory

### Can't fetch widget HTML

If the build script can't fetch the HTML:
1. Verify dev server is running: `npm run dev`
2. Check the widget loads in browser: `http://localhost:3000/widget/todo`
3. Ensure no TypeScript or React errors in the console

## Example: Complete Todo Widget

See the reference implementation:
- **Source**: [app/widget/todo/page.tsx](app/widget/todo/page.tsx)
- **Built**: [public/todo-widget.html](public/todo-widget.html)
- **MCP**: [app/mcp/route.ts](app/mcp/route.ts)

This demonstrates the complete pattern from development to deployment.
