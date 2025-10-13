/**
 * Builder Pattern Demo
 *
 * This example shows how to use the fluent builder API
 * for more advanced widget configurations.
 */

import createMcpHandler, {
  experimental_createWidget,
  experimental_createWidgetResponse,
} from "../src";
import { z } from "zod";

// Example 1: Task Dashboard with Builder Pattern
const taskDashboard = experimental_createWidget({
  id: "task_dashboard",
  title: "Task Dashboard",
  description: "Interactive task management dashboard",

  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: system-ui, sans-serif;
            padding: 20px;
            margin: 0;
            background: #f5f7fa;
          }
          .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
          }
          .column {
            background: white;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .column h3 {
            margin: 0 0 12px 0;
            font-size: 14px;
            text-transform: uppercase;
            color: #666;
          }
          .task {
            background: #f9fafb;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 8px;
            border-left: 3px solid #3b82f6;
          }
          .task-title {
            font-weight: 600;
            margin-bottom: 4px;
          }
          .task-assignee {
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div id="dashboard" class="dashboard"></div>
        <script>
          const data = window.openai?.toolOutput?.structuredContent;

          if (data?.columns) {
            const dashboard = document.getElementById('dashboard');

            data.columns.forEach(column => {
              const columnDiv = document.createElement('div');
              columnDiv.className = 'column';

              const title = document.createElement('h3');
              title.textContent = column.title + ' (' + column.tasks.length + ')';
              columnDiv.appendChild(title);

              column.tasks.forEach(task => {
                const taskDiv = document.createElement('div');
                taskDiv.className = 'task';
                taskDiv.innerHTML =
                  '<div class="task-title">' + task.title + '</div>' +
                  '<div class="task-assignee">👤 ' + task.assignee + '</div>';
                columnDiv.appendChild(taskDiv);
              });

              dashboard.appendChild(columnDiv);
            });
          }
        </script>
      </body>
    </html>
  `,

  inputSchema: {
    projectId: z.string().optional().describe("Project ID to filter tasks"),
  },

  handler: async ({ projectId }) => {
    // Simulate fetching tasks
    const tasks = [
      { id: "1", title: "Design landing page", assignee: "Alice", status: "todo" },
      { id: "2", title: "Implement auth flow", assignee: "Bob", status: "in_progress" },
      { id: "3", title: "Write unit tests", assignee: "Charlie", status: "in_progress" },
      { id: "4", title: "Deploy to staging", assignee: "Diana", status: "done" },
      { id: "5", title: "Code review PR #123", assignee: "Eve", status: "done" },
    ];

    const columns = [
      {
        id: "todo",
        title: "To Do",
        tasks: tasks.filter((t) => t.status === "todo"),
      },
      {
        id: "in_progress",
        title: "In Progress",
        tasks: tasks.filter((t) => t.status === "in_progress"),
      },
      {
        id: "done",
        title: "Done",
        tasks: tasks.filter((t) => t.status === "done"),
      },
    ];

    return experimental_createWidgetResponse({
      structuredContent: { columns },
      modelText: `Showing ${tasks.length} tasks across 3 columns`,
      widgetData: {
        projectId,
        lastUpdated: new Date().toISOString(),
      },
    });
  },
})
  // Chain builder methods
  .withBorder()
  .withStatusText("Loading your tasks...", "Tasks loaded successfully")
  .withToolCallsEnabled(); // Allow widget to call tools

// Example 2: Simple Counter with Minimal Config
const counterWidget = experimental_createWidget({
  id: "counter",
  title: "Counter",
  description: "A simple counter widget",

  html: `
    <style>
      body {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 150px;
        margin: 0;
        font-family: system-ui, sans-serif;
      }
      .counter {
        text-align: center;
      }
      .count {
        font-size: 48px;
        font-weight: bold;
        color: #3b82f6;
      }
    </style>
    <div class="counter">
      <div class="count" id="count">0</div>
      <p>Current Count</p>
    </div>
    <script>
      const count = window.openai?.toolOutput?.structuredContent?.count || 0;
      document.getElementById('count').textContent = count;
    </script>
  `,

  inputSchema: {
    count: z.number().default(0).describe("The count to display"),
  },

  handler: async ({ count }) => ({
    structuredContent: { count },
  }),
}).withBorder();

// Example 3: Widget with Dynamic HTML Loading
const analyticsWidget = experimental_createWidget({
  id: "analytics",
  title: "Analytics Dashboard",
  description: "Real-time analytics visualization",

  // HTML can be loaded asynchronously
  html: async () => {
    // In a real app, you might fetch from a CDN or read from a file
    return `
      <style>
        body {
          font-family: system-ui, sans-serif;
          padding: 20px;
          margin: 0;
        }
        .metric {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin: 10px;
          min-width: 150px;
        }
        .metric-value {
          font-size: 32px;
          font-weight: bold;
        }
        .metric-label {
          font-size: 12px;
          opacity: 0.9;
          text-transform: uppercase;
        }
      </style>
      <div id="metrics"></div>
      <script>
        const data = window.openai?.toolOutput?.structuredContent;
        if (data?.metrics) {
          const container = document.getElementById('metrics');
          data.metrics.forEach(metric => {
            const div = document.createElement('div');
            div.className = 'metric';
            div.innerHTML =
              '<div class="metric-value">' + metric.value + '</div>' +
              '<div class="metric-label">' + metric.label + '</div>';
            container.appendChild(div);
          });
        }
      </script>
    `;
  },

  inputSchema: {
    timeRange: z.enum(["day", "week", "month"]).default("day"),
  },

  handler: async ({ timeRange }) => ({
    structuredContent: {
      metrics: [
        { label: "Total Users", value: "1,234" },
        { label: "Active Now", value: "89" },
        { label: "Revenue", value: "$5.6K" },
      ],
      timeRange,
    },
  }),
})
  .withBorder()
  .withStatusText("Loading analytics...", "Analytics loaded")
  .withCSP(
    ["https://api.analytics.example.com"], // Allowed fetch domains
    ["https://cdn.example.com"] // Allowed resource domains
  );

// Create the MCP handler with all widgets
const handler = createMcpHandler(async (server) => {
  await taskDashboard.register(server);
  await counterWidget.register(server);
  await analyticsWidget.register(server);

  console.log("✅ All widgets registered!");
  console.log("  - Task Dashboard (with builder pattern)");
  console.log("  - Counter (minimal config)");
  console.log("  - Analytics (async HTML)");
});

export { handler as GET, handler as POST };
