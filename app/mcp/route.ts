import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Load widget HTML from public directory
 *
 * Workflow:
 * 1. Dev mode: Develop the widget at /app/widget/todo/page.tsx
 * 2. Build: Run `npm run build:widget` to generate static HTML
 * 3. Serve: MCP loads the built HTML and serves it as a resource
 *
 * The built HTML is loaded from public/todo-widget.html
 */
let todoWidgetHtml: string;
try {
  todoWidgetHtml = readFileSync(
    join(process.cwd(), "public", "todo-widget.html"),
    "utf8"
  );
  console.log("✅ Loaded todo widget HTML from public/todo-widget.html");
} catch (error) {
  console.error("❌ Failed to read todo-widget.html:", error);
  console.error("💡 Run 'npm run build:widget' to generate the widget HTML");
  // Fallback minimal HTML if file doesn't exist
  todoWidgetHtml = `
    <!DOCTYPE html>
    <html><body>
      <div style="padding: 20px; font-family: sans-serif;">
        <h2>Widget Not Built</h2>
        <p>Run <code>npm run build:widget</code> to generate the widget HTML.</p>
      </div>
    </body></html>
  `;
}

// In-memory todo storage
let todos: Array<{ id: string; title: string; completed: boolean }> = [];
let nextId = 1;

// StreamableHttp server
const handler = createMcpHandler(
  async (server) => {
    // Register the HTML widget as a resource
    server.registerResource(
      "todo-widget",
      "ui://widget/todo.html",
      {},
      async () => ({
        contents: [
          {
            uri: "ui://widget/todo.html",
            mimeType: "text/html+skybridge",
            text: todoWidgetHtml, // Loaded from public/todo-widget.html
            _meta: {
              "openai/widgetPrefersBorder": true,
              "openai/widgetAccessible": true,
            },
          },
        ],
      })
    );

    // Tool to add a todo
    server.registerTool(
      "add_todo",
      {
        title: "Add todo",
        description: "Creates a todo item with the given title.",
        inputSchema: z.object({
          title: z.string().min(1),
        }),
        _meta: {
          "openai/outputTemplate": "ui://widget/todo.html",
          "openai/toolInvocation/invoking": "Adding todo",
          "openai/toolInvocation/invoked": "Added todo",
        },
      },
      async ({ title }) => {
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
      }
    );

    // Tool to complete a todo
    server.registerTool(
      "complete_todo",
      {
        title: "Complete todo",
        description: "Marks a todo as done by id.",
        inputSchema: z.object({
          id: z.string().min(1),
        }),
        _meta: {
          "openai/outputTemplate": "ui://widget/todo.html",
          "openai/toolInvocation/invoking": "Completing todo",
          "openai/toolInvocation/invoked": "Completed todo",
        },
      },
      async ({ id }) => {
        const todo = todos.find((task) => task.id === id);
        if (!todo) {
          return {
            content: [
              { type: "text", text: `Todo ${id} was not found.` },
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
        }

        todos = todos.map((task) =>
          task.id === id ? { ...task, completed: true } : task
        );

        return {
          content: [
            { type: "text", text: `Completed "${todo.title}".` },
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
      }
    );

    // Tool to list all todos
    server.registerTool(
      "list_todos",
      {
        title: "List todos",
        description: "Shows all todos in the list.",
        inputSchema: z.object({}),
        _meta: {
          "openai/outputTemplate": "ui://widget/todo.html",
        },
      },
      async () => ({
        content: [
          { type: "text", text: `You have ${todos.length} todos.` },
          {
            type: "text",
            text: `<widget-data>${JSON.stringify({ tasks: todos })}</widget-data>`,
          },
        ],
        structuredContent: { tasks: todos },
        _meta: {
          "openai/widgetData": { tasks: todos },
        },
      })
    );
  },
  {},
  {
    basePath: "",
    verboseLogs: true,
    maxDuration: 60,
    disableSse: true,
  }
);

export { handler as GET, handler as POST, handler as DELETE };
