import { z } from "zod";

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
 * TEMPORARY: Using inline minimal config to unblock testing
 * TODO: Fix bundler to properly load generated-shopify-config.json
 */
export function loadShopifyConfigSync(): ShopifyConfig {
  // Minimal hardcoded config with baseball collection for testing
  return {
    sales_channels: ["Online Store"],
    product_types: {
      "DTF": {
        type_name: "DTF Design",
        vendor: "InkMerge",
        variants: [
          { size: "Adult Left Chest  (4\")", sku_suffix: "LC04IN", price: 1.99 },
          { size: "Adult Full Front (11\")", sku_suffix: "FF11IN", price: 4.99 },
          { size: "Youth (9\")", sku_suffix: "Y09IN", price: 3.99 },
          { size: "Toddler (6\")", sku_suffix: "T06IN", price: 2.99 },
          { size: "Hat (3\")", sku_suffix: "H03IN", price: 1.99 },
        ],
      },
      "POD": {
        type_name: "POD Apparel",
        vendor: "InkMerge",
        variants: [
          { size: "Small", sku_suffix: "S", price: 25.00 },
          { size: "Medium", sku_suffix: "M", price: 25.00 },
          { size: "Large", sku_suffix: "L", price: 25.00 },
        ],
      },
    },
    collections: [
      {
        id: "660569817382",
        name: "Baseball  – DTF Designs",
        keywords: ["baseball", "dtf", "designs", "dtf-baseball"],
        tags_required: ["channel:dtf", "theme:baseball"],
        boost_score: 1,
      },
      {
        id: "660562051366",
        name: "Animals  – DTF Designs",
        keywords: ["animals", "dtf", "designs", "dtf-animals"],
        tags_required: ["channel:dtf"],
        boost_score: 1,
      },
    ],
    theme_tags: ["theme:baseball", "theme:animals", "theme:sports"],
    style_tags: ["style:graphic", "style:text"],
    audience_tags: ["audience:fans", "audience:team-parents"],
    metafield_options: {
      compatible_printer: ["DTF Printer", "Sublimation"],
      paper_size: ["8.5x11", "11x17"],
      care_instructions: ["Machine wash cold", "Do not bleach"],
    },
    confidence_thresholds: {
      auto_publish: 96,
      quarantine: 75,
      reject: 60,
    },
  };
}
