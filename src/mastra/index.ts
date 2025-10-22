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
import { getEnvironmentStatus } from "./utils/env-validator";
import { getDashboardHTML } from "./utils/dashboard-html";

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

// Startup environment check
const startupStatus = getEnvironmentStatus();
console.log('\n' + '='.repeat(80));
console.log('🚀 PRODUCT AUTOMATION SYSTEM STARTING');
console.log('='.repeat(80));

if (startupStatus.status === 'ready') {
  console.log('✅ Environment: All configured');
} else {
  console.log('⚠️  Environment: Configuration incomplete');
  console.log('\n' + startupStatus.message);
  console.log('\nℹ️  System will start but automation may fail until configured.');
}

console.log('\n📊 Dashboard: http://localhost:5000/dashboard');
console.log('🔧 Status API: http://localhost:5000/api/status');
console.log('='.repeat(80) + '\n');

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
      // System status endpoint
      {
        path: "/api/status",
        method: "GET",
        createHandler: async ({ mastra }) => {
          return async (c) => {
            const envStatus = getEnvironmentStatus();
            const logger = mastra.getLogger();

            if (envStatus.status !== 'ready') {
              logger?.warn('⚠️ [System] Environment not fully configured', { status: envStatus.message });
            }

            return c.json({
              status: envStatus.status,
              message: envStatus.message,
              timestamp: new Date().toISOString(),
            });
          };
        },
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
            const html = getDashboardHTML();
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
