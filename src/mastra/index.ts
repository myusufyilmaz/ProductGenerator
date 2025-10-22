import { Mastra } from "@mastra/core";
import { MastraError } from "@mastra/core/error";
import { PinoLogger } from "@mastra/loggers";
import { LogLevel, MastraLogger } from "@mastra/core/logger";
import pino from "pino";
import { MCPServer } from "@mastra/mcp";
import { NonRetriableError } from "inngest";
import { z } from "zod";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { desc, sql } from "drizzle-orm";

import { sharedPostgresStorage } from "./storage";
import { inngest, inngestServe, registerCronWorkflow } from "./inngest";
import { productAutomationWorkflow } from "./workflows/productAutomationWorkflow";
import { contentGeneratorAgent } from "./agents/contentGeneratorAgent";
import * as schema from "../../shared/schema";

class ProductionPinoLogger extends MastraLogger {
  protected logger: pino.Logger;

  constructor(
    options: {
      name?: string;
      level?: LogLevel;
    } = {},
  ) {
    super(options);

    this.logger = pino({
      name: options.name || "app",
      level: options.level || LogLevel.INFO,
      base: {},
      formatters: {
        level: (label: string, _number: number) => ({
          level: label,
        }),
      },
      timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
    });
  }

  debug(message: string, args: Record<string, any> = {}): void {
    this.logger.debug(args, message);
  }

  info(message: string, args: Record<string, any> = {}): void {
    this.logger.info(args, message);
  }

  warn(message: string, args: Record<string, any> = {}): void {
    this.logger.warn(args, message);
  }

  error(message: string, args: Record<string, any> = {}): void {
    this.logger.error(args, message);
  }
}

// Register the automation workflow to run every 2 hours
// Timezone: Use environment variable or default to Pacific Time
// Cron: 0 */2 * * * = Every 2 hours at minute 0
registerCronWorkflow(
  `TZ=${process.env.SCHEDULE_CRON_TIMEZONE || 'America/Los_Angeles'} ${process.env.SCHEDULE_CRON_EXPRESSION || '0 */2 * * *'}`,
  productAutomationWorkflow
);

export const mastra = new Mastra({
  storage: sharedPostgresStorage,
  // Register your workflows here
  workflows: { productAutomationWorkflow },
  // Register your agents here
  agents: { contentGeneratorAgent },
  mcpServers: {
    allTools: new MCPServer({
      name: "allTools",
      version: "1.0.0",
      tools: {},
    }),
  },
  bundler: {
    // A few dependencies are not properly picked up by
    // the bundler if they are not added directly to the
    // entrypoint.
    externals: [
      "@slack/web-api",
      "inngest",
      "inngest/hono",
      "hono",
      "hono/streaming",
    ],
    // sourcemaps are good for debugging.
    sourcemap: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    middleware: [
      async (c, next) => {
        const mastra = c.get("mastra");
        const logger = mastra?.getLogger();
        logger?.debug("[Request]", { method: c.req.method, url: c.req.url });
        try {
          await next();
        } catch (error) {
          logger?.error("[Response]", {
            method: c.req.method,
            url: c.req.url,
            error,
          });
          if (error instanceof MastraError) {
            if (error.id === "AGENT_MEMORY_MISSING_RESOURCE_ID") {
              // This is typically a non-retirable error. It means that the request was not
              // setup correctly to pass in the necessary parameters.
              throw new NonRetriableError(error.message, { cause: error });
            }
          } else if (error instanceof z.ZodError) {
            // Validation errors are never retriable.
            throw new NonRetriableError(error.message, { cause: error });
          }

          throw error;
        }
      },
    ],
    apiRoutes: [
      // This API route is used to register the Mastra workflow (inngest function) on the inngest server
      {
        path: "/api/inngest",
        method: "ALL",
        createHandler: async ({ mastra }) => inngestServe({ mastra, inngest }),
        // The inngestServe function integrates Mastra workflows with Inngest by:
        // 1. Creating Inngest functions for each workflow with unique IDs (workflow.${workflowId})
        // 2. Setting up event handlers that:
        //    - Generate unique run IDs for each workflow execution
        //    - Create an InngestExecutionEngine to manage step execution
        //    - Handle workflow state persistence and real-time updates
        // 3. Establishing a publish-subscribe system for real-time monitoring
        //    through the workflow:${workflowId}:${runId} channel
      },
      // Dashboard data API endpoint
      {
        path: "/api/dashboard/data",
        method: "GET",
        createHandler: async ({ mastra }) => {
          return async (c) => {
            const logger = mastra.getLogger();
            logger?.info('📊 [Dashboard] Fetching automation status');
            
            try {
              const pool = new Pool({ connectionString: process.env.DATABASE_URL });
              const db = drizzle(pool, { schema });

              // Fetch recent processing runs
              const runs = await db
                .select()
                .from(schema.processing_runs)
                .orderBy(desc(schema.processing_runs.started_at))
                .limit(10);

              // Fetch recent processed products
              const products = await db
                .select()
                .from(schema.processed_products)
                .orderBy(desc(schema.processed_products.created_at))
                .limit(50);

              // Get summary statistics
              const stats = await db
                .select({
                  total_products: sql<number>`COUNT(*)`,
                  published: sql<number>`COUNT(*) FILTER (WHERE status = 'published')`,
                  processing: sql<number>`COUNT(*) FILTER (WHERE status = 'processing')`,
                  review: sql<number>`COUNT(*) FILTER (WHERE status = 'review')`,
                  failed: sql<number>`COUNT(*) FILTER (WHERE status = 'failed')`,
                  pending: sql<number>`COUNT(*) FILTER (WHERE status = 'pending')`,
                  total_cost: sql<number>`COALESCE(SUM(CAST(total_cost AS NUMERIC)), 0)`,
                })
                .from(schema.processed_products);

              await pool.end();

              logger?.info('✅ [Dashboard] Data fetched successfully');

              return c.json({
                runs,
                products,
                stats: stats[0] || {
                  total_products: 0,
                  published: 0,
                  processing: 0,
                  review: 0,
                  failed: 0,
                  pending: 0,
                  total_cost: 0,
                },
                timestamp: new Date().toISOString(),
              });
            } catch (error) {
              logger?.error('❌ [Dashboard] Error fetching data', { error });
              return c.json({ error: 'Failed to fetch dashboard data' }, 500);
            }
          };
        },
      },
      // Dashboard HTML page
      {
        path: "/dashboard",
        method: "GET",
        createHandler: async () => {
          return async (c) => {
            const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Automation Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    .header {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    h1 {
      color: #333;
      font-size: 32px;
      margin-bottom: 10px;
    }
    .subtitle {
      color: #666;
      font-size: 14px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      transition: transform 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-5px);
    }
    .stat-value {
      font-size: 36px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 5px;
    }
    .stat-label {
      color: #666;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .section {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 20px;
      color: #333;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #f0f0f0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #f0f0f0;
    }
    th {
      background: #f8f9fa;
      color: #666;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .status-published { background: #d4edda; color: #155724; }
    .status-processing { background: #fff3cd; color: #856404; }
    .status-review { background: #cce5ff; color: #004085; }
    .status-failed { background: #f8d7da; color: #721c24; }
    .status-pending { background: #e2e3e5; color: #383d41; }
    .status-running { background: #d1ecf1; color: #0c5460; }
    .status-completed { background: #d4edda; color: #155724; }
    .refresh-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      float: right;
    }
    .refresh-btn:hover {
      background: #5568d3;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
    }
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #999;
    }
    .empty-state-icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    .cost-highlight {
      color: #667eea;
      font-weight: 600;
    }
    .truncate {
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Product Automation Dashboard</h1>
      <p class="subtitle">Real-time monitoring for your Shopify product listing automation</p>
      <button class="refresh-btn" onclick="loadData()">↻ Refresh</button>
    </div>

    <div class="stats-grid" id="stats-grid">
      <div class="loading">Loading statistics...</div>
    </div>

    <div class="section">
      <h2 class="section-title">📦 Recent Products</h2>
      <div id="products-table">
        <div class="loading">Loading products...</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">🔄 Processing Runs</h2>
      <div id="runs-table">
        <div class="loading">Loading runs...</div>
      </div>
    </div>
  </div>

  <script>
    async function loadData() {
      try {
        const response = await fetch('/api/dashboard/data');
        const data = await response.json();
        
        renderStats(data.stats);
        renderProducts(data.products);
        renderRuns(data.runs);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    }

    function renderStats(stats) {
      const statsGrid = document.getElementById('stats-grid');
      statsGrid.innerHTML = \`
        <div class="stat-card">
          <div class="stat-value">\${stats.total_products || 0}</div>
          <div class="stat-label">Total Products</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${stats.published || 0}</div>
          <div class="stat-label">Published</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${stats.processing || 0}</div>
          <div class="stat-label">Processing</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${stats.review || 0}</div>
          <div class="stat-label">In Review</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${stats.failed || 0}</div>
          <div class="stat-label">Failed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">$\${(parseFloat(stats.total_cost) / 100 || 0).toFixed(2)}</div>
          <div class="stat-label">Total Cost</div>
        </div>
      \`;
    }

    function renderProducts(products) {
      const container = document.getElementById('products-table');
      
      if (!products || products.length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <div class="empty-state-icon">📦</div>
            <p>No products processed yet. Add SKU folders to your Google Drive to get started!</p>
          </div>
        \`;
        return;
      }

      const rows = products.map(p => \`
        <tr>
          <td class="truncate" title="\${p.product_title || p.file_name}">\${p.product_title || p.file_name}</td>
          <td><span class="status-badge status-\${p.status}">\${p.status}</span></td>
          <td>\${p.overall_confidence || '-'}%</td>
          <td class="truncate" title="\${p.folder_path}">\${p.folder_path}</td>
          <td>\${p.assigned_collection_name || '-'}</td>
          <td class="cost-highlight">$\${(parseFloat(p.total_cost) / 100 || 0).toFixed(3)}</td>
          <td>\${new Date(p.created_at).toLocaleString()}</td>
        </tr>
      \`).join('');

      container.innerHTML = \`
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Status</th>
              <th>Quality</th>
              <th>Source</th>
              <th>Collection</th>
              <th>Cost</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            \${rows}
          </tbody>
        </table>
      \`;
    }

    function renderRuns(runs) {
      const container = document.getElementById('runs-table');
      
      if (!runs || runs.length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <div class="empty-state-icon">🔄</div>
            <p>No automation runs yet. The workflow will start processing every 2 hours once deployed!</p>
          </div>
        \`;
        return;
      }

      const rows = runs.map(r => \`
        <tr>
          <td>\${r.run_id}</td>
          <td><span class="status-badge status-\${r.status}">\${r.status}</span></td>
          <td>\${r.total_files_scanned || 0}</td>
          <td>\${r.new_products_found || 0}</td>
          <td>\${r.products_published || 0}</td>
          <td>\${r.products_failed || 0}</td>
          <td class="cost-highlight">$\${(parseFloat(r.total_run_cost) / 100 || 0).toFixed(2)}</td>
          <td>\${new Date(r.started_at).toLocaleString()}</td>
        </tr>
      \`).join('');

      container.innerHTML = \`
        <table>
          <thead>
            <tr>
              <th>Run ID</th>
              <th>Status</th>
              <th>Scanned</th>
              <th>Found</th>
              <th>Published</th>
              <th>Failed</th>
              <th>Cost</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            \${rows}
          </tbody>
        </table>
      \`;
    }

    // Load data on page load
    loadData();
    
    // Auto-refresh every 30 seconds
    setInterval(loadData, 30000);
  </script>
</body>
</html>
            `;
            return c.html(html);
          };
        },
      },
    ],
  },
  logger:
    process.env.NODE_ENV === "production"
      ? new ProductionPinoLogger({
          name: "Mastra",
          level: "info",
        })
      : new PinoLogger({
          name: "Mastra",
          level: "info",
        }),
});

/*  Sanity check 1: Throw an error if there are more than 1 workflows.  */
// !!!!!! Do not remove this check. !!!!!!
if (Object.keys(mastra.getWorkflows()).length > 1) {
  throw new Error(
    "More than 1 workflows found. Currently, more than 1 workflows are not supported in the UI, since doing so will cause app state to be inconsistent.",
  );
}

/*  Sanity check 2: Throw an error if there are more than 1 agents.  */
// !!!!!! Do not remove this check. !!!!!!
if (Object.keys(mastra.getAgents()).length > 1) {
  throw new Error(
    "More than 1 agents found. Currently, more than 1 agents are not supported in the UI, since doing so will cause app state to be inconsistent.",
  );
}
