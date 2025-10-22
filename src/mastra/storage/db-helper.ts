import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../../shared/schema";
import { eq, desc } from "drizzle-orm";

let dbInstance: ReturnType<typeof drizzle> | null = null;
let poolInstance: Pool | null = null;

export function getDb() {
  if (!dbInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL not configured");
    }
    poolInstance = new Pool({ connectionString: process.env.DATABASE_URL });
    dbInstance = drizzle(poolInstance, { schema });
  }
  return dbInstance;
}

export async function closeDb() {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
    dbInstance = null;
  }
}

export async function createProcessingRun(runId: string) {
  const db = getDb();
  const [run] = await db
    .insert(schema.processing_runs)
    .values({
      run_id: runId,
      status: "running",
      total_files_scanned: 0,
      new_products_found: 0,
      products_published: 0,
      products_quarantined: 0,
      products_rejected: 0,
      products_failed: 0,
    })
    .returning();
  return run;
}

export async function updateProcessingRun(
  runId: string,
  updates: {
    total_files_scanned?: number;
    new_products_found?: number;
    products_published?: number;
    products_quarantined?: number;
    products_rejected?: number;
    products_failed?: number;
    total_run_cost?: string;
    status?: string;
    error_message?: string;
    completed_at?: Date;
    duration_seconds?: number;
  }
) {
  const db = getDb();
  await db
    .update(schema.processing_runs)
    .set(updates)
    .where(eq(schema.processing_runs.run_id, runId));
}

export async function checkProductExists(folderId: string): Promise<boolean> {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.processed_products)
    .where(eq(schema.processed_products.google_drive_file_id, folderId))
    .limit(1);
  return existing.length > 0;
}

export async function createProcessedProduct(data: {
  google_drive_file_id: string;
  file_name: string;
  folder_path: string;
  status: string;
  processing_stage?: string;
  product_title?: string;
  product_handle?: string;
  shopify_product_id?: string;
  overall_confidence?: number;
  content_quality_score?: number;
  completeness_score?: number;
  uniqueness_score?: number;
  seo_readiness_score?: number;
  assigned_collection_id?: string;
  assigned_collection_name?: string;
  collection_match_confidence?: number;
  vision_api_cost?: string;
  perplexity_api_cost?: string;
  openai_api_cost?: string;
  total_cost?: string;
  generated_data?: any;
  quality_issues?: any;
  error_message?: string;
  published_at?: Date;
}) {
  const db = getDb();
  const [product] = await db
    .insert(schema.processed_products)
    .values(data)
    .returning();
  return product;
}

export async function updateProcessedProduct(
  id: number,
  updates: {
    status?: string;
    processing_stage?: string;
    product_title?: string;
    product_handle?: string;
    shopify_product_id?: string;
    overall_confidence?: number;
    content_quality_score?: number;
    completeness_score?: number;
    uniqueness_score?: number;
    seo_readiness_score?: number;
    assigned_collection_id?: string;
    assigned_collection_name?: string;
    collection_match_confidence?: number;
    vision_api_cost?: string;
    perplexity_api_cost?: string;
    openai_api_cost?: string;
    total_cost?: string;
    generated_data?: any;
    quality_issues?: any;
    error_message?: string;
    published_at?: Date;
    updated_at?: Date;
  }
) {
  const db = getDb();
  await db
    .update(schema.processed_products)
    .set({ ...updates, updated_at: new Date() })
    .where(eq(schema.processed_products.id, id));
}

export async function saveRecentDescription(
  productId: number,
  description: string
) {
  const db = getDb();
  await db.insert(schema.recent_descriptions).values({
    product_id: productId,
    description_text: description,
  });
}

export async function getRecentDescriptions(limit: number = 50) {
  const db = getDb();
  const descriptions = await db
    .select()
    .from(schema.recent_descriptions)
    .orderBy(desc(schema.recent_descriptions.created_at))
    .limit(limit);
  return descriptions.map((d) => d.description_text);
}
