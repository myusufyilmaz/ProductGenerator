import { pgTable, serial, varchar, text, integer, timestamp, boolean, jsonb, decimal } from "drizzle-orm/pg-core";

/**
 * Database Schema for Shopify Product Automation
 * 
 * Tracks:
 * - Processed products (avoid duplicates)
 * - Quality metrics and confidence scores
 * - Cost tracking for API usage
 * - Processing history and errors
 */

// Processed products tracking
export const processed_products = pgTable("processed_products", {
  id: serial("id").primaryKey(),
  
  // Source information
  google_drive_file_id: varchar("google_drive_file_id", { length: 255 }).notNull().unique(),
  file_name: varchar("file_name", { length: 500 }).notNull(),
  folder_path: varchar("folder_path", { length: 1000 }).notNull(),
  
  // Generated product data
  shopify_product_id: varchar("shopify_product_id", { length: 100 }),
  product_title: varchar("product_title", { length: 500 }),
  product_handle: varchar("product_handle", { length: 500 }),
  
  // Quality metrics
  overall_confidence: integer("overall_confidence"), // 0-100
  content_quality_score: integer("content_quality_score"),
  completeness_score: integer("completeness_score"),
  uniqueness_score: integer("uniqueness_score"),
  seo_readiness_score: integer("seo_readiness_score"),
  
  // Collection and categorization
  assigned_collection_id: varchar("assigned_collection_id", { length: 100 }),
  assigned_collection_name: varchar("assigned_collection_name", { length: 255 }),
  collection_match_confidence: integer("collection_match_confidence"),
  
  // Processing status
  status: varchar("status", { length: 50 }).notNull(), // pending, processing, published, review, failed, rejected
  processing_stage: varchar("processing_stage", { length: 100 }), // analyze, generate, validate, publish
  error_message: text("error_message"),
  
  // Cost tracking (in cents)
  vision_api_cost: decimal("vision_api_cost", { precision: 10, scale: 2 }),
  perplexity_api_cost: decimal("perplexity_api_cost", { precision: 10, scale: 2 }),
  openai_api_cost: decimal("openai_api_cost", { precision: 10, scale: 2 }),
  total_cost: decimal("total_cost", { precision: 10, scale: 2 }),
  
  // Metadata
  generated_data: jsonb("generated_data"), // Full generated product data for review
  quality_issues: jsonb("quality_issues"), // Quality validation issues
  
  // Timestamps
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  published_at: timestamp("published_at"),
});

// Processing runs tracking
export const processing_runs = pgTable("processing_runs", {
  id: serial("id").primaryKey(),
  
  run_id: varchar("run_id", { length: 100 }).notNull().unique(),
  
  // Statistics
  total_files_scanned: integer("total_files_scanned").notNull().default(0),
  new_products_found: integer("new_products_found").notNull().default(0),
  products_published: integer("products_published").notNull().default(0),
  products_quarantined: integer("products_quarantined").notNull().default(0),
  products_rejected: integer("products_rejected").notNull().default(0),
  products_failed: integer("products_failed").notNull().default(0),
  
  // Cost tracking
  total_run_cost: decimal("total_run_cost", { precision: 10, scale: 2 }),
  
  // Performance
  duration_seconds: integer("duration_seconds"),
  
  // Status
  status: varchar("status", { length: 50 }).notNull(), // running, completed, failed
  error_message: text("error_message"),
  
  // Timestamps
  started_at: timestamp("started_at").notNull().defaultNow(),
  completed_at: timestamp("completed_at"),
});

// Recent descriptions for anti-repetition
export const recent_descriptions = pgTable("recent_descriptions", {
  id: serial("id").primaryKey(),
  
  product_id: integer("product_id").references(() => processed_products.id),
  description_text: text("description_text").notNull(),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
});
