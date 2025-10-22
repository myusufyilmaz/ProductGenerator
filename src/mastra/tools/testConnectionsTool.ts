import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import "@shopify/shopify-api/adapters/node";
import { createOpenAI } from "@ai-sdk/openai";

export const testConnectionsTool = createTool({
  id: "test-connections",
  description: "Tests all API connections (Shopify, Google Vision, Perplexity, OpenAI)",
  
  inputSchema: z.object({}),
  
  outputSchema: z.object({
    shopify: z.object({
      connected: z.boolean(),
      store_name: z.string().optional(),
      error: z.string().optional(),
    }),
    google_vision: z.object({
      configured: z.boolean(),
      error: z.string().optional(),
    }),
    perplexity: z.object({
      configured: z.boolean(),
      error: z.string().optional(),
    }),
    openai: z.object({
      configured: z.boolean(),
      error: z.string().optional(),
    }),
  }),
  
  execute: async ({ mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔌 [TestConnections] Testing API connections');
    
    const results = {
      shopify: { connected: false, store_name: undefined as string | undefined, error: undefined as string | undefined },
      google_vision: { configured: false, error: undefined as string | undefined },
      perplexity: { configured: false, error: undefined as string | undefined },
      openai: { configured: false, error: undefined as string | undefined },
    };
    
    // Test Shopify
    try {
      logger?.info('🛍️ [TestConnections] Testing Shopify connection');
      
      if (!process.env.SHOPIFY_STORE_URL || !process.env.SHOPIFY_ACCESS_TOKEN) {
        results.shopify.error = "Missing SHOPIFY_STORE_URL or SHOPIFY_ACCESS_TOKEN";
      } else {
        const shopify = shopifyApi({
          apiSecretKey: process.env.SHOPIFY_ACCESS_TOKEN,
          apiVersion: ApiVersion.October24,
          isCustomStoreApp: true,
          adminApiAccessToken: process.env.SHOPIFY_ACCESS_TOKEN,
          isEmbeddedApp: false,
          hostName: process.env.SHOPIFY_STORE_URL.replace(/^https?:\/\//, ''),
        });
        
        const session = shopify.session.customAppSession(process.env.SHOPIFY_STORE_URL);
        const client = new shopify.clients.Rest({ session });
        
        const response = await client.get({ path: 'shop' });
        const shop = (response.body as any).shop;
        
        results.shopify.connected = true;
        results.shopify.store_name = shop.name;
        logger?.info('✅ [TestConnections] Shopify connected', { store: shop.name });
      }
    } catch (error: any) {
      results.shopify.error = error.message || 'Connection failed';
      logger?.error('❌ [TestConnections] Shopify failed', { error: error.message });
    }
    
    // Test Google Cloud Vision
    try {
      logger?.info('👁️ [TestConnections] Testing Google Cloud Vision');
      
      if (!process.env.GOOGLE_CLOUD_VISION_API_KEY) {
        results.google_vision.error = "Missing GOOGLE_CLOUD_VISION_API_KEY";
      } else {
        // Just check if key is set - actual API test would require an image
        results.google_vision.configured = true;
        logger?.info('✅ [TestConnections] Google Cloud Vision API key configured');
      }
    } catch (error: any) {
      results.google_vision.error = error.message || 'Configuration failed';
      logger?.error('❌ [TestConnections] Google Cloud Vision failed', { error: error.message });
    }
    
    // Test Perplexity
    try {
      logger?.info('🔍 [TestConnections] Testing Perplexity');
      
      if (!process.env.PERPLEXITY_API_KEY) {
        results.perplexity.error = "Missing PERPLEXITY_API_KEY";
      } else {
        // Just check if key is set
        results.perplexity.configured = true;
        logger?.info('✅ [TestConnections] Perplexity API key configured');
      }
    } catch (error: any) {
      results.perplexity.error = error.message || 'Configuration failed';
      logger?.error('❌ [TestConnections] Perplexity failed', { error: error.message });
    }
    
    // Test OpenAI (Replit AI Integrations)
    try {
      logger?.info('🤖 [TestConnections] Testing OpenAI');
      
      if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY || !process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
        results.openai.error = "Missing AI_INTEGRATIONS_OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_BASE_URL";
      } else {
        results.openai.configured = true;
        logger?.info('✅ [TestConnections] OpenAI (Replit AI Integrations) configured');
      }
    } catch (error: any) {
      results.openai.error = error.message || 'Configuration failed';
      logger?.error('❌ [TestConnections] OpenAI failed', { error: error.message });
    }
    
    logger?.info('📊 [TestConnections] Connection test complete', results);
    
    return results;
  },
});
