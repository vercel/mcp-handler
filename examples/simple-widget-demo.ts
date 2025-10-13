/**
 * Simple Widget Demo
 *
 * This example shows how to use the experimental_createWidget API
 * to create a basic greeting widget with minimal boilerplate.
 */

import createMcpHandler, { experimental_createWidget } from "../src";
import { z } from "zod";

// Create a simple greeting widget
const greetingWidget = experimental_createWidget({
  id: "simple_greeting",
  title: "Simple Greeting",
  description: "Displays a personalized greeting message",

  // The HTML that will be rendered in ChatGPT
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 200px;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .greeting {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          }
          .timestamp {
            font-size: 12px;
            opacity: 0.8;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script>
          // Access the data passed from the tool
          const data = window.openai?.toolOutput?.structuredContent;

          if (data) {
            const root = document.getElementById('root');
            root.innerHTML =
              '<div class="greeting">' +
              '👋 Hello, ' + data.name + '!' +
              '<div class="timestamp">Generated at ' + new Date(data.timestamp).toLocaleString() + '</div>' +
              '</div>';
          }
        </script>
      </body>
    </html>
  `,

  // Input schema using Zod
  inputSchema: {
    name: z.string().describe("The name of the person to greet"),
  },

  // Optional: Customize the widget behavior
  metadata: {
    prefersBorder: true,
    invoking: "Creating your greeting...",
    invoked: "Greeting ready!",
  },

  // Handler that returns the data
  handler: async ({ name }) => {
    return {
      structuredContent: {
        name: name,
        timestamp: new Date().toISOString(),
      },
      content: [
        {
          type: "text",
          text: `Created a greeting for ${name}`,
        },
      ],
    };
  },
});

// Create the MCP handler
const handler = createMcpHandler(async (server) => {
  // Register the widget (creates both resource and tool automatically)
  await greetingWidget.register(server);

  console.log("✅ Simple greeting widget registered!");
});

export { handler as GET, handler as POST };
