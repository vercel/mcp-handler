import createMcpHandler, { experimental_createWidget } from "../src";
import { z } from "zod";

/**
 * Example: Simple widget with minimal configuration
 */
const simpleWidget = experimental_createWidget({
  id: "simple_widget",
  title: "Simple Widget",
  description: "A simple widget example",
  html: "<div>Hello World</div>",
  handler: async () => ({
    structuredContent: { message: "Hello from simple widget" },
  }),
});

/**
 * Example: Widget with input schema and structured response
 */
const greetingWidget = experimental_createWidget({
  id: "greeting_widget",
  title: "Greeting Widget",
  description: "Displays a personalized greeting",
  html: `
    <div id="root"></div>
    <script>
      const props = window.openai?.toolOutput;
      document.getElementById('root').textContent =
        'Hello, ' + (props?.structuredContent?.name || 'World') + '!';
    </script>
  `,
  inputSchema: {
    name: z.string().describe("The name to display"),
  },
  metadata: {
    prefersBorder: true,
    invoking: "Creating greeting...",
    invoked: "Greeting created",
  },
  handler: async ({ name }) => ({
    structuredContent: {
      name,
      timestamp: new Date().toISOString(),
    },
    content: [{ type: "text", text: `Greeting for ${name}` }],
  }),
});

/**
 * Example: Widget using builder pattern for advanced configuration
 */
const kanbanWidget = experimental_createWidget({
  id: "kanban_board",
  title: "Kanban Board",
  description: "Interactive task board",
  html: `
    <div id="kanban"></div>
    <style>
      #kanban { display: flex; gap: 16px; padding: 16px; }
      .column { flex: 1; background: #f5f5f5; padding: 12px; border-radius: 8px; }
    </style>
    <script>
      const data = window.openai?.toolOutput?.structuredContent;
      const kanban = document.getElementById('kanban');

      if (data?.columns) {
        data.columns.forEach(col => {
          const div = document.createElement('div');
          div.className = 'column';
          div.innerHTML = '<h3>' + col.title + '</h3>';
          col.tasks.forEach(task => {
            const taskDiv = document.createElement('div');
            taskDiv.textContent = task.title;
            div.appendChild(taskDiv);
          });
          kanban.appendChild(div);
        });
      }
    </script>
  `,
  inputSchema: {
    projectId: z.string().optional(),
  },
  handler: async ({ projectId }) => ({
    structuredContent: {
      columns: [
        {
          id: "todo",
          title: "To Do",
          tasks: [{ id: "1", title: "Task 1" }],
        },
        {
          id: "in_progress",
          title: "In Progress",
          tasks: [{ id: "2", title: "Task 2" }],
        },
        {
          id: "done",
          title: "Done",
          tasks: [{ id: "3", title: "Task 3" }],
        },
      ],
    },
    _meta: {
      projectId,
      fullTaskData: {}, // Extra data not visible to model
    },
  }),
})
  .withBorder()
  .withToolCallsEnabled()
  .withStatusText("Loading board...", "Board loaded")
  .withCSP(
    ["https://api.example.com"], // connect_domains
    ["https://cdn.example.com"] // resource_domains
  );

/**
 * Example: Widget with async HTML loading
 */
const dynamicWidget = experimental_createWidget({
  id: "dynamic_widget",
  title: "Dynamic Widget",
  description: "Widget with dynamically loaded HTML",
  html: async () => {
    // In a real app, this might fetch from a CDN or read from a file
    return `
      <div>
        <h1>Dynamically Loaded Content</h1>
        <p>This HTML was loaded asynchronously</p>
      </div>
    `;
  },
  handler: async () => ({
    structuredContent: { loaded: true },
  }),
});

/**
 * MCP Route Handler with multiple widgets
 */
const handler = createMcpHandler(async (server) => {
  // Register all widgets
  await simpleWidget.register(server);
  await greetingWidget.register(server);
  await kanbanWidget.register(server);
  await dynamicWidget.register(server);

  // You can still register regular tools alongside widgets
  server.registerTool(
    "echo",
    {
      title: "Echo",
      description: "Echo a message",
      inputSchema: {
        message: z.string(),
      },
    },
    async ({ message }) => ({
      content: [{ type: "text", text: message }],
    })
  );
});

export { handler as GET, handler as POST };
