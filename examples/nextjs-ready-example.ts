/**
 * Next.js Ready Example
 *
 * Copy this file to your Next.js app:
 * app/api/mcp/route.ts
 *
 * Then run: npm run dev
 * Test at: http://localhost:3000/api/mcp
 */

import createMcpHandler, { experimental_createWidget } from "mcp-handler";
import { z } from "zod";

// Widget 1: User Profile Card
const profileWidget = experimental_createWidget({
  id: "user_profile",
  title: "User Profile",
  description: "Display a user profile card with avatar and details",

  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            padding: 24px;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 200px;
          }
          .card {
            background: white;
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 400px;
          }
          .avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            margin: 0 auto 16px;
          }
          h1 {
            margin: 0 0 8px 0;
            font-size: 24px;
            color: #1a1a1a;
          }
          .role {
            color: #666;
            margin: 0 0 16px 0;
          }
          .stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid #eee;
          }
          .stat {
            text-align: center;
          }
          .stat-value {
            font-size: 20px;
            font-weight: bold;
            color: #667eea;
          }
          .stat-label {
            font-size: 12px;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script>
          const data = window.openai?.toolOutput?.structuredContent;

          if (data) {
            const initials = data.name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase();

            document.getElementById('root').innerHTML =
              '<div class="card">' +
                '<div class="avatar">' + initials + '</div>' +
                '<h1>' + data.name + '</h1>' +
                '<p class="role">' + data.role + '</p>' +
                '<div class="stats">' +
                  '<div class="stat">' +
                    '<div class="stat-value">' + data.stats.projects + '</div>' +
                    '<div class="stat-label">Projects</div>' +
                  '</div>' +
                  '<div class="stat">' +
                    '<div class="stat-value">' + data.stats.commits + '</div>' +
                    '<div class="stat-label">Commits</div>' +
                  '</div>' +
                  '<div class="stat">' +
                    '<div class="stat-value">' + data.stats.reviews + '</div>' +
                    '<div class="stat-label">Reviews</div>' +
                  '</div>' +
                '</div>' +
              '</div>';
          }
        </script>
      </body>
    </html>
  `,

  inputSchema: {
    username: z.string().describe("GitHub username or name to display"),
  },

  handler: async ({ username }) => {
    // In a real app, you'd fetch from an API
    return {
      structuredContent: {
        name: username,
        role: "Software Engineer",
        stats: {
          projects: 12,
          commits: 1234,
          reviews: 89,
        },
      },
      content: [
        {
          type: "text",
          text: `Showing profile for ${username}`,
        },
      ],
    };
  },
})
  .withBorder()
  .withStatusText("Loading profile...", "Profile loaded!");

// Widget 2: Color Palette Generator
const colorPaletteWidget = experimental_createWidget({
  id: "color_palette",
  title: "Color Palette",
  description: "Generate a beautiful color palette",

  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: system-ui, sans-serif;
            padding: 20px;
            margin: 0;
          }
          .palette {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 12px;
          }
          .color {
            aspect-ratio: 1;
            border-radius: 8px;
            display: flex;
            align-items: flex-end;
            padding: 12px;
            color: white;
            font-family: monospace;
            font-size: 12px;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: transform 0.2s;
          }
          .color:hover {
            transform: scale(1.05);
          }
          h2 {
            margin: 0 0 16px 0;
            font-size: 18px;
          }
        </style>
      </head>
      <body>
        <h2 id="title"></h2>
        <div id="palette" class="palette"></div>
        <script>
          const data = window.openai?.toolOutput?.structuredContent;

          if (data) {
            document.getElementById('title').textContent = data.name;

            const palette = document.getElementById('palette');
            data.colors.forEach(color => {
              const div = document.createElement('div');
              div.className = 'color';
              div.style.backgroundColor = color;
              div.textContent = color;
              div.title = 'Click to copy';
              div.onclick = () => {
                navigator.clipboard?.writeText(color);
              };
              palette.appendChild(div);
            });
          }
        </script>
      </body>
    </html>
  `,

  inputSchema: {
    theme: z
      .enum(["ocean", "sunset", "forest", "monochrome"])
      .default("ocean")
      .describe("Color theme"),
  },

  handler: async ({ theme }) => {
    const palettes = {
      ocean: ["#001f3f", "#0074D9", "#7FDBFF", "#39CCCC", "#3D9970"],
      sunset: ["#FF4136", "#FF851B", "#FFDC00", "#F012BE", "#B10DC9"],
      forest: ["#2ECC40", "#01FF70", "#3D9970", "#3C6E47", "#1B4D3E"],
      monochrome: ["#111111", "#333333", "#666666", "#999999", "#CCCCCC"],
    };

    return {
      structuredContent: {
        name: theme.charAt(0).toUpperCase() + theme.slice(1) + " Palette",
        colors: palettes[theme],
        theme,
      },
      content: [
        {
          type: "text",
          text: `Generated ${theme} color palette with ${palettes[theme].length} colors`,
        },
      ],
    };
  },
}).withBorder();

// Widget 3: Countdown Timer
const countdownWidget = experimental_createWidget({
  id: "countdown",
  title: "Countdown Timer",
  description: "Display a countdown to a specific date",

  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: system-ui, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 250px;
            margin: 0;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 20px;
          }
          h1 {
            font-size: 24px;
            margin: 0 0 32px 0;
            text-align: center;
          }
          .countdown {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
          }
          .time-unit {
            text-align: center;
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 12px;
            backdrop-filter: blur(10px);
          }
          .time-value {
            font-size: 48px;
            font-weight: bold;
            line-height: 1;
          }
          .time-label {
            font-size: 12px;
            text-transform: uppercase;
            opacity: 0.8;
            margin-top: 8px;
          }
        </style>
      </head>
      <body>
        <h1 id="title"></h1>
        <div id="countdown" class="countdown"></div>
        <script>
          const data = window.openai?.toolOutput?.structuredContent;

          if (data) {
            document.getElementById('title').textContent =
              'Countdown to ' + data.eventName;

            function updateCountdown() {
              const now = new Date().getTime();
              const target = new Date(data.targetDate).getTime();
              const diff = target - now;

              if (diff < 0) {
                document.getElementById('countdown').innerHTML =
                  '<div style="grid-column: 1/-1; text-align: center; font-size: 24px;">' +
                  '🎉 Event has started! 🎉' +
                  '</div>';
                return;
              }

              const days = Math.floor(diff / (1000 * 60 * 60 * 24));
              const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((diff % (1000 * 60)) / 1000);

              document.getElementById('countdown').innerHTML =
                '<div class="time-unit">' +
                  '<div class="time-value">' + days + '</div>' +
                  '<div class="time-label">Days</div>' +
                '</div>' +
                '<div class="time-unit">' +
                  '<div class="time-value">' + hours + '</div>' +
                  '<div class="time-label">Hours</div>' +
                '</div>' +
                '<div class="time-unit">' +
                  '<div class="time-value">' + minutes + '</div>' +
                  '<div class="time-label">Minutes</div>' +
                '</div>' +
                '<div class="time-unit">' +
                  '<div class="time-value">' + seconds + '</div>' +
                  '<div class="time-label">Seconds</div>' +
                '</div>';
            }

            updateCountdown();
            setInterval(updateCountdown, 1000);
          }
        </script>
      </body>
    </html>
  `,

  inputSchema: {
    eventName: z.string().describe("Name of the event"),
    targetDate: z.string().describe("Target date (ISO format or date string)"),
  },

  handler: async ({ eventName, targetDate }) => {
    return {
      structuredContent: {
        eventName,
        targetDate,
      },
      content: [
        {
          type: "text",
          text: `Created countdown for ${eventName} on ${targetDate}`,
        },
      ],
    };
  },
}).withBorder();

// Create the MCP handler
const handler = createMcpHandler(
  async (server) => {
    // Register all widgets
    await profileWidget.register(server);
    await colorPaletteWidget.register(server);
    await countdownWidget.register(server);

    console.log("✅ MCP Server ready with 3 widgets:");
    console.log("  1. User Profile Card");
    console.log("  2. Color Palette Generator");
    console.log("  3. Countdown Timer");
  },
  {
    serverInfo: {
      name: "widget-demo-server",
      version: "1.0.0",
    },
  }
);

export { handler as GET, handler as POST };
