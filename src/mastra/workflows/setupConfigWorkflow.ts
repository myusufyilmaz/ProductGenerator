import { createStep, createWorkflow } from "../inngest";
import { z } from "zod";
import { RuntimeContext } from "@mastra/core/di";
import { fetchShopifyStoreCatalogTool } from "../tools/shopifyDataFetchTool";
import { buildConfigFromShopifyDataTool } from "../tools/configBuilderTool";
import fs from "fs/promises";
import path from "path";

/**
 * Setup Configuration Workflow
 * 
 * This workflow:
 * 1. Fetches all collections, products, tags from your Shopify store
 * 2. Builds the automation configuration automatically
 * 3. Saves it to file for use by the main automation
 * 
 * Run this ONCE to setup, then your automation uses the real config
 */

const fetchShopifyDataStep = createStep({
  id: "fetch-shopify-data",
  description: "Fetches all collections, products, and tags from Shopify store",
  
  inputSchema: z.object({}),
  
  outputSchema: z.object({
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
    total_products: z.number(),
  }),
  
  execute: async ({ mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🚀 [SetupConfig] Step 1: Fetching Shopify store catalog');
    
    const runtimeContext = new RuntimeContext();
    
    const result = await fetchShopifyStoreCatalogTool.execute({
      context: { include_products: true },
      runtimeContext,
      mastra,
    });
    
    logger?.info('✅ [SetupConfig] Shopify data fetched', {
      collections: result.collections.length,
      products: result.total_products,
      tags: result.all_tags.length,
    });
    
    return result;
  },
});

const buildConfigurationStep = createStep({
  id: "build-configuration",
  description: "Builds automation configuration from Shopify data",
  
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
    total_products: z.number(),
  }),
  
  outputSchema: z.object({
    config: z.any(),
    summary: z.object({
      collections_count: z.number(),
      tags_count: z.number(),
      product_types_count: z.number(),
    }),
  }),
  
  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🏗️ [SetupConfig] Step 2: Building configuration');
    
    const runtimeContext = new RuntimeContext();
    
    const result = await buildConfigFromShopifyDataTool.execute({
      context: inputData,
      runtimeContext,
      mastra,
    });
    
    logger?.info('✅ [SetupConfig] Configuration built', result.summary);
    
    return result;
  },
});

const saveConfigurationStep = createStep({
  id: "save-configuration",
  description: "Saves configuration to file",
  
  inputSchema: z.object({
    config: z.any(),
    summary: z.object({
      collections_count: z.number(),
      tags_count: z.number(),
      product_types_count: z.number(),
    }),
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    file_path: z.string(),
    summary: z.object({
      collections_count: z.number(),
      tags_count: z.number(),
      product_types_count: z.number(),
    }),
  }),
  
  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('💾 [SetupConfig] Step 3: Saving configuration');
    
    try {
      // Save to file for easy inspection and runtime use
      const configPath = path.join(process.cwd(), 'src/mastra/config/generated-shopify-config.json');
      await fs.writeFile(configPath, JSON.stringify(inputData.config, null, 2), 'utf-8');
      
      logger?.info('✅ [SetupConfig] Configuration saved', { 
        path: configPath,
        collections: inputData.summary.collections_count,
        tags: inputData.summary.tags_count,
        product_types: inputData.summary.product_types_count,
      });
      
      return {
        success: true,
        file_path: configPath,
        summary: inputData.summary,
      };
      
    } catch (error) {
      logger?.error('❌ [SetupConfig] Error saving configuration', { error });
      throw error;
    }
  },
});

export const setupConfigWorkflow = createWorkflow({
  id: "setup-config-workflow",
  description: "One-time setup: Fetches Shopify data and builds automation configuration",
  inputSchema: z.object({}),
  outputSchema: z.object({
    success: z.boolean(),
    file_path: z.string(),
    summary: z.object({
      collections_count: z.number(),
      tags_count: z.number(),
      product_types_count: z.number(),
    }),
  }),
})
  .then(fetchShopifyDataStep)
  .then(buildConfigurationStep)
  .then(saveConfigurationStep)
  .commit();
