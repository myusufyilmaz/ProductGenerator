import { z } from "zod";
import * as generatedConfig from "./generated-shopify-config.json";

/**
 * Shopify Product Listing Configuration
 * 
 * Configuration is now built dynamically from your Shopify store data
 * Run the setupConfigWorkflow to generate this from your real store
 */

// Collection definition with keywords for matching
export const CollectionSchema = z.object({
  id: z.string().describe("Unique collection identifier"),
  name: z.string().describe("Display name of the collection"),
  tags_required: z.array(z.string()).describe("Tags that must be applied when this collection is chosen"),
  keywords: z.array(z.string()).describe("Keywords used to match products to this collection"),
  boost_score: z.number().optional().default(1).describe("Multiplier for keyword matches (1.0 = normal, 2.0 = double weight)"),
});

export type Collection = z.infer<typeof CollectionSchema>;

// Product variant configuration
export const VariantSchema = z.object({
  size: z.string().describe("Variant size name (e.g., 'Adult Left Chest (4\")')"),
  sku_suffix: z.string().describe("SKU suffix for this variant (e.g., 'ALC')"),
  price: z.number().describe("Price for this variant"),
  inventory_quantity: z.number().optional().default(5000).describe("Default inventory quantity"),
});

export type Variant = z.infer<typeof VariantSchema>;

// Product type configuration
export const ProductTypeConfigSchema = z.object({
  type_name: z.string().describe("Shopify product type (e.g., 'DTF Design')"),
  variants: z.array(VariantSchema).describe("Available variants for this product type"),
  vendor: z.string().describe("Vendor name"),
});

export type ProductTypeConfig = z.infer<typeof ProductTypeConfigSchema>;

// Master configuration
export const ShopifyConfigSchema = z.object({
  sales_channels: z.array(z.string()).describe("Sales channels to publish to"),
  product_types: z.record(z.string(), ProductTypeConfigSchema).describe("Product type configurations keyed by folder identifier (DTF, POD, etc.)"),
  collections: z.array(CollectionSchema).describe("Available Shopify collections"),
  theme_tags: z.array(z.string()).describe("Available theme tags"),
  style_tags: z.array(z.string()).describe("Available style tags"),
  audience_tags: z.array(z.string()).describe("Available audience tags"),
  metafield_options: z.object({
    compatible_printer: z.array(z.string()).optional(),
    paper_size: z.array(z.string()).optional(),
    care_instructions: z.array(z.string()).optional(),
  }).describe("Predefined metafield options"),
  confidence_thresholds: z.object({
    auto_publish: z.number().default(75).describe("Confidence % required for auto-publishing"),
    quarantine: z.number().default(60).describe("Confidence % threshold for quarantine review"),
    reject: z.number().default(60).describe("Below this % will be rejected and regenerated"),
  }).describe("Quality confidence thresholds"),
});

export type ShopifyConfig = z.infer<typeof ShopifyConfigSchema>;


/**
 * Synchronous version for tools that need immediate access
 * Loads from generated JSON file if available
 */
export function loadShopifyConfigSync(): ShopifyConfig {
  // Import the JSON config directly (bundler will include it)
  return generatedConfig as ShopifyConfig;
}
