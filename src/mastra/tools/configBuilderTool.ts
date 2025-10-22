import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { ShopifyConfig, Collection, ProductTypeConfig } from "../config/shopify-config";

/**
 * Configuration Builder Tool
 * 
 * Builds the automation configuration dynamically from existing Shopify store data
 * This ensures perfect alignment with your current store setup
 */

export const buildConfigFromShopifyDataTool = createTool({
  id: "build-config-from-shopify-data",
  description: "Builds automation configuration from existing Shopify store data",
  
  inputSchema: z.object({
    collections: z.array(z.object({
      id: z.string(),
      title: z.string(),
      handle: z.string(),
      product_count: z.number(),
    })),
    all_tags: z.array(z.string()),
    product_types: z.array(z.string()),
    vendors: z.array(z.string()),
    sample_variants: z.array(z.object({
      product_type: z.string(),
      size: z.string(),
      price: z.number(),
      sku_pattern: z.string(),
    })),
  }),
  
  outputSchema: z.object({
    config: z.any().describe("Generated ShopifyConfig object"),
    summary: z.object({
      collections_count: z.number(),
      tags_count: z.number(),
      product_types_count: z.number(),
    }),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🏗️ [ConfigBuilder] Building configuration from Shopify data');
    
    try {
      // Build collections with keyword extraction
      const collections: Collection[] = context.collections.map(col => {
        // Extract keywords from collection title
        const keywords = col.title
          .toLowerCase()
          .split(/[\s\-_]+/)
          .filter(word => word.length > 2);
        
        // Determine required tags based on collection title
        const tags_required: string[] = [];
        
        // Channel detection
        if (col.title.toLowerCase().includes('dtf')) {
          tags_required.push('channel:dtf');
        } else if (col.title.toLowerCase().includes('pod') || col.title.toLowerCase().includes('apparel')) {
          tags_required.push('channel:pod');
        }
        
        // Theme detection from title
        const titleLower = col.title.toLowerCase();
        if (titleLower.includes('emt') || titleLower.includes('medical') || titleLower.includes('emergency')) {
          tags_required.push('theme:emt');
        } else if (titleLower.includes('sport')) {
          tags_required.push('theme:sports');
        } else if (titleLower.includes('baseball')) {
          tags_required.push('theme:baseball');
        } else if (titleLower.includes('football')) {
          tags_required.push('theme:football');
        }
        
        return {
          id: col.id,
          name: col.title,
          tags_required,
          keywords: Array.from(new Set([...keywords, col.handle])),
          boost_score: 1.0,
        };
      });
      
      logger?.info('📚 [ConfigBuilder] Built collections', { count: collections.length });
      
      // Extract tag categories
      const theme_tags: string[] = [];
      const style_tags: string[] = [];
      const audience_tags: string[] = [];
      const channel_tags: string[] = [];
      
      for (const tag of context.all_tags) {
        const tagLower = tag.toLowerCase();
        if (tagLower.startsWith('theme:') || tagLower.startsWith('theme-')) {
          theme_tags.push(tag);
        } else if (tagLower.startsWith('style:') || tagLower.startsWith('style-')) {
          style_tags.push(tag);
        } else if (tagLower.startsWith('audience:') || tagLower.startsWith('audience-')) {
          audience_tags.push(tag);
        } else if (tagLower.startsWith('channel:') || tagLower.startsWith('channel-')) {
          channel_tags.push(tag);
        }
      }
      
      logger?.info('🏷️ [ConfigBuilder] Categorized tags', {
        theme: theme_tags.length,
        style: style_tags.length,
        audience: audience_tags.length,
        channel: channel_tags.length,
      });
      
      // Build product type configurations from sample variants
      const productTypeConfigs: Record<string, ProductTypeConfig> = {};
      
      for (const productType of context.product_types) {
        // Find variants for this product type
        const typeVariants = context.sample_variants
          .filter(v => v.product_type === productType)
          .map(v => ({
            size: v.size,
            sku_suffix: v.sku_pattern.split('-').pop() || v.size.substring(0, 3).toUpperCase(),
            price: v.price,
            inventory_quantity: 5000,
          }));
        
        // Deduplicate by size
        const uniqueVariants = Array.from(
          new Map(typeVariants.map(v => [v.size, v])).values()
        );
        
        if (uniqueVariants.length > 0) {
          const vendor = context.vendors[0] || 'Store';
          
          productTypeConfigs[productType.toUpperCase().replace(/\s+/g, '_')] = {
            type_name: productType,
            vendor,
            variants: uniqueVariants,
          };
        }
      }
      
      logger?.info('📦 [ConfigBuilder] Built product type configs', { 
        count: Object.keys(productTypeConfigs).length 
      });
      
      // Build complete configuration
      const config: ShopifyConfig = {
        sales_channels: [
          "Online Store",
          "Google & YouTube",
          "Inbox",
        ],
        product_types: productTypeConfigs,
        collections,
        theme_tags: theme_tags.length > 0 ? theme_tags : ["theme:general"],
        style_tags: style_tags.length > 0 ? style_tags : ["style:modern"],
        audience_tags: audience_tags.length > 0 ? audience_tags : ["audience:adults"],
        metafield_options: {
          compatible_printer: ["DTF-X", "L1800", "Universal"],
          paper_size: ["8.5x11", "11x17"],
          care_instructions: ["Wash inside out", "Low heat tumble dry"],
        },
        confidence_thresholds: {
          auto_publish: 75,
          quarantine: 60,
          reject: 60,
        },
      };
      
      logger?.info('✅ [ConfigBuilder] Configuration built successfully', {
        collections: collections.length,
        product_types: Object.keys(productTypeConfigs).length,
        total_tags: context.all_tags.length,
      });
      
      return {
        config,
        summary: {
          collections_count: collections.length,
          tags_count: context.all_tags.length,
          product_types_count: Object.keys(productTypeConfigs).length,
        },
      };
      
    } catch (error) {
      logger?.error('❌ [ConfigBuilder] Error building configuration', { error });
      throw error;
    }
  },
});
