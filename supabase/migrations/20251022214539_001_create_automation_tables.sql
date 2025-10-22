/*
  # Create Product Automation Tables

  1. New Tables
    - `processed_products`
      - Tracks all products processed through the automation pipeline
      - Stores quality metrics, confidence scores, and processing status
      - Links to Google Drive files and Shopify products

    - `processing_runs`
      - Tracks each automation workflow run
      - Stores aggregate statistics and performance metrics

    - `recent_descriptions`
      - Stores recent product descriptions for anti-repetition checking

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated service access
*/

-- Processed products tracking
CREATE TABLE IF NOT EXISTS processed_products (
  id SERIAL PRIMARY KEY,

  -- Source information
  google_drive_file_id VARCHAR(255) NOT NULL UNIQUE,
  file_name VARCHAR(500) NOT NULL,
  folder_path VARCHAR(1000) NOT NULL,

  -- Generated product data
  shopify_product_id VARCHAR(100),
  product_title VARCHAR(500),
  product_handle VARCHAR(500),

  -- Quality metrics
  overall_confidence INTEGER,
  content_quality_score INTEGER,
  completeness_score INTEGER,
  uniqueness_score INTEGER,
  seo_readiness_score INTEGER,

  -- Collection and categorization
  assigned_collection_id VARCHAR(100),
  assigned_collection_name VARCHAR(255),
  collection_match_confidence INTEGER,

  -- Processing status
  status VARCHAR(50) NOT NULL,
  processing_stage VARCHAR(100),
  error_message TEXT,

  -- Cost tracking (in cents)
  vision_api_cost DECIMAL(10, 2),
  perplexity_api_cost DECIMAL(10, 2),
  openai_api_cost DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),

  -- Metadata
  generated_data JSONB,
  quality_issues JSONB,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  published_at TIMESTAMP
);

-- Processing runs tracking
CREATE TABLE IF NOT EXISTS processing_runs (
  id SERIAL PRIMARY KEY,

  run_id VARCHAR(100) NOT NULL UNIQUE,

  -- Statistics
  total_files_scanned INTEGER NOT NULL DEFAULT 0,
  new_products_found INTEGER NOT NULL DEFAULT 0,
  products_published INTEGER NOT NULL DEFAULT 0,
  products_quarantined INTEGER NOT NULL DEFAULT 0,
  products_rejected INTEGER NOT NULL DEFAULT 0,
  products_failed INTEGER NOT NULL DEFAULT 0,

  -- Cost tracking
  total_run_cost DECIMAL(10, 2),

  -- Performance
  duration_seconds INTEGER,

  -- Status
  status VARCHAR(50) NOT NULL,
  error_message TEXT,

  -- Timestamps
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Recent descriptions for anti-repetition
CREATE TABLE IF NOT EXISTS recent_descriptions (
  id SERIAL PRIMARY KEY,

  product_id INTEGER REFERENCES processed_products(id),
  description_text TEXT NOT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE processed_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recent_descriptions ENABLE ROW LEVEL SECURITY;

-- Policies for service role access
CREATE POLICY "Service can manage processed_products"
  ON processed_products
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service can manage processing_runs"
  ON processing_runs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service can manage recent_descriptions"
  ON recent_descriptions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_processed_products_status ON processed_products(status);
CREATE INDEX IF NOT EXISTS idx_processed_products_folder_path ON processed_products(folder_path);
CREATE INDEX IF NOT EXISTS idx_processed_products_created_at ON processed_products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processing_runs_started_at ON processing_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_recent_descriptions_created_at ON recent_descriptions(created_at DESC);
