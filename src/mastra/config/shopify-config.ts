import { z } from "zod";

/**
 * Shopify Product Listing Configuration
 * 
 * This file defines the master configuration for automated Shopify listings.
 * All AI decisions are constrained to these predefined options - no hallucination possible.
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
 * Default configuration - user should customize this
 */
export const defaultShopifyConfig: ShopifyConfig = {
  sales_channels: [
    "Online Store",
    "Google & YouTube",
    "Inbox",
  ],
  product_types: {
    DTF: {
      type_name: "DTF Design",
      vendor: "InkMerge",
      variants: [
        { size: "Adult Left Chest (4\")", sku_suffix: "ALC", price: 3.99, inventory_quantity: 5000 },
        { size: "Adult Full Front (11\")", sku_suffix: "AFF", price: 4.99, inventory_quantity: 5000 },
        { size: "Youth (8\")", sku_suffix: "Y08", price: 3.99, inventory_quantity: 5000 },
        { size: "Toddler (6\")", sku_suffix: "T06", price: 2.99, inventory_quantity: 5000 },
        { size: "Hat (3\")", sku_suffix: "H03", price: 1.99, inventory_quantity: 5000 },
      ],
    },
    POD: {
      type_name: "Print on Demand",
      vendor: "InkMerge",
      variants: [
        { size: "Small", sku_suffix: "S", price: 19.99, inventory_quantity: 100 },
        { size: "Medium", sku_suffix: "M", price: 19.99, inventory_quantity: 100 },
        { size: "Large", sku_suffix: "L", price: 19.99, inventory_quantity: 100 },
        { size: "X-Large", sku_suffix: "XL", price: 21.99, inventory_quantity: 100 },
        { size: "2X-Large", sku_suffix: "2XL", price: 23.99, inventory_quantity: 100 },
      ],
    },
  },
  collections: [
    {
      id: "emt-dtf-designs",
      name: "EMT - DTF Designs",
      tags_required: ["channel:dtf", "theme:emt"],
      keywords: ["emt", "emergency", "medical", "paramedic", "ambulance", "first responder", "healthcare"],
      boost_score: 1.0,
    },
    {
      id: "emt-pod-apparel",
      name: "EMT - POD Apparel",
      tags_required: ["channel:pod", "theme:emt"],
      keywords: ["emt", "emergency", "medical", "paramedic", "shirt", "hoodie", "apparel", "clothing"],
      boost_score: 1.0,
    },
    {
      id: "sports-dtf-designs",
      name: "Sports - DTF Designs",
      tags_required: ["channel:dtf", "theme:sports"],
      keywords: ["sports", "baseball", "football", "basketball", "soccer", "athletic", "team"],
      boost_score: 1.0,
    },
  ],
  theme_tags: ["theme:emt", "theme:sports", "theme:baseball", "theme:football", "theme:patriotic"],
  style_tags: ["style:playful", "style:professional", "style:vintage", "style:modern"],
  audience_tags: ["audience:team-parents", "audience:adults", "audience:youth"],
  metafield_options: {
    compatible_printer: ["DTF-X", "L1800", "Universal"],
    paper_size: ["8.5x11", "11x17"],
    care_instructions: ["Wash inside out", "Low heat tumble dry", "Do not iron directly on design"],
  },
  confidence_thresholds: {
    auto_publish: 75,
    quarantine: 60,
    reject: 60,
  },
};

/**
 * Load configuration from environment or use default
 */
export function loadShopifyConfig(): ShopifyConfig {
  // In production, you could load this from a database or config file
  // For now, we use the default configuration
  return defaultShopifyConfig;
}
