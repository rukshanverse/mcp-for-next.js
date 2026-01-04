import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Build script for widget pages
 *
 * This script:
 * 1. Fetches the rendered HTML from a running Next.js dev server
 * 2. Post-processes to add data injection scripts
 * 3. Saves to public/ directory for MCP resource serving
 *
 * Usage:
 *   1. Start dev server: npm run dev
 *   2. In another terminal: npm run build:widget
 */

const WIDGET_CONFIG = {
  route: "/widget/todo",
  url: "http://localhost:3000/widget/todo",
  output: join(__dirname, "..", "public", "todo-widget.html"),
};

async function buildWidget() {
  console.log("🔨 Building widget from Next.js server...\n");

  try {
    // Step 1: Fetch the rendered HTML from dev server
    console.log(`📖 Fetching HTML from: ${WIDGET_CONFIG.url}`);
    console.log(`💡 Make sure your dev server is running (npm run dev)\n`);

    const response = await fetch(WIDGET_CONFIG.url);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${response.statusText}\n` +
          `Make sure the Next.js dev server is running on port 3000`
      );
    }

    let html = await response.text();

    // Step 2: Post-process the HTML
    console.log("🔧 Post-processing HTML...");
    html = processWidgetHtml(html);

    // Step 3: Ensure output directory exists
    const outputDir = dirname(WIDGET_CONFIG.output);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Step 4: Write the final HTML file
    writeFileSync(WIDGET_CONFIG.output, html, "utf8");

    console.log(`\n✅ Widget built successfully!`);
    console.log(`📄 Output: ${WIDGET_CONFIG.output}`);
    console.log(`📦 File size: ${(html.length / 1024).toFixed(2)} KB`);
    console.log(
      `\n💡 The widget is now ready to be served by the MCP server at ui://widget/todo.html`
    );
  } catch (error) {
    console.error("\n❌ Failed to build widget:");
    console.error(error.message);

    if (error.cause?.code === "ECONNREFUSED") {
      console.error("\n💡 Make sure Next.js dev server is running:");
      console.error("   npm run dev");
    }

    process.exit(1);
  }
}

/**
 * Post-process the HTML to optimize for widget use
 */
function processWidgetHtml(html) {
  // Add data injection scripts for OpenAI ChatGPT integration
  const dataInjectionScript = `
    <script>
        // Multiple methods to receive data (OpenAI ChatGPT integration)
        function checkAndRenderData() {
            // Method 1: Check window.openai.toolOutput
            if (typeof window !== 'undefined' && window.openai?.toolOutput?.tasks) {
                if (window.renderTodos) window.renderTodos(window.openai.toolOutput.tasks);
                return true;
            }
            // Method 2: Check window.openai.toolResponseMetadata
            if (typeof window !== 'undefined' && window.openai?.toolResponseMetadata?.['openai/widgetData']?.tasks) {
                if (window.renderTodos) window.renderTodos(window.openai.toolResponseMetadata['openai/widgetData'].tasks);
                return true;
            }
            return false;
        }

        // Method 3: Listen for postMessage events
        window.addEventListener('message', (event) => {
            if (event.data.type === 'structuredContent' && event.data.content?.tasks) {
                if (window.renderTodos) window.renderTodos(event.data.content.tasks);
            }
            if (event.data.type === 'widgetData' && event.data.tasks) {
                if (window.renderTodos) window.renderTodos(event.data.tasks);
            }
        });

        // Initial check on load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', checkAndRenderData);
        } else {
            checkAndRenderData();
        }

        // Poll for data (OpenAI may inject data after mount)
        const interval = setInterval(() => {
            if (checkAndRenderData()) {
                clearInterval(interval);
            }
        }, 100);

        // Stop polling after 5 seconds
        setTimeout(() => clearInterval(interval), 5000);
    </script>
  `;

  // Insert before closing body tag
  if (html.includes("</body>")) {
    html = html.replace("</body>", `${dataInjectionScript}</body>`);
  } else {
    html += dataInjectionScript;
  }

  return html;
}

// Run the build
buildWidget();
