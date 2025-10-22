import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Shopify Data Fetch Tool
 * 
 * Pulls all existing data from Shopify store:
 * - Collections with their products
 * - All product tags
 * - Product types and vendors
 * - Variant configurations
 * 
 * This data is used to automatically build the configuration
 */

async function getShopifyClient() {
  // Dynamic import to avoid adapter issues
  const { shopifyApi, ApiVersion } = await import("@shopify/shopify-api");
  await import("@shopify/shopify-api/adapters/node");
  
  if (!process.env.SHOPIFY_STORE_URL || !process.env.SHOPIFY_ACCESS_TOKEN) {
    throw new Error("Shopify credentials not configured");
  }

  const shopify = shopifyApi({
    apiSecretKey: process.env.SHOPIFY_ACCESS_TOKEN!,
    apiVersion: ApiVersion.October24,
    isCustomStoreApp: true,
    adminApiAccessToken: process.env.SHOPIFY_ACCESS_TOKEN!,
    isEmbeddedApp: false,
    hostName: process.env.SHOPIFY_STORE_URL!.replace(/^https?:\/\//, ''),
  });

  return shopify;
}

export const fetchShopifyStoreCatalogTool = createTool({
  id: "fetch-shopify-store-catalog",
  description: "Fetches complete catalog from Shopify: collections, products, tags, types, variants",
  
  inputSchema: z.object({
    include_products: z.boolean().optional().default(true).describe("Whether to fetch full product details"),
  }),
  
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
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔍 [ShopifyFetch] Fetching store catalog', { include_products: context.include_products });
    
    try {
      const shopify = await getShopifyClient();
      const session = shopify.session.customAppSession(process.env.SHOPIFY_STORE_URL!);
      const client = new shopify.clients.Rest({ session });
      
      // Fetch all collections
      logger?.info('📚 [ShopifyFetch] Fetching collections');
      const collectionsResponse = await client.get({
        path: 'custom_collections',
      });
      
      const customCollections = (collectionsResponse.body as any).custom_collections || [];
      
      const smartCollectionsResponse = await client.get({
        path: 'smart_collections',
      });
      
      const smartCollections = (smartCollectionsResponse.body as any).smart_collections || [];
      
      const allCollections = [...customCollections, ...smartCollections].map((c: any) => ({
        id: c.id.toString(),
        title: c.title,
        handle: c.handle,
        product_count: c.products_count || 0,
      }));
      
      logger?.info('✅ [ShopifyFetch] Collections fetched', { count: allCollections.length });
      
      // Fetch all products to extract tags, types, vendors
      logger?.info('📦 [ShopifyFetch] Fetching products');
      
      const allTags = new Set<string>();
      const productTypes = new Set<string>();
      const vendors = new Set<string>();
      const variantExamples: Array<{
        product_type: string;
        size: string;
        price: number;
        sku_pattern: string;
      }> = [];
      
      let totalProducts = 0;
      let hasMore = true;
      let params: any = { limit: 250 };
      
      while (hasMore && context.include_products) {
        const productsResponse = await client.get({
          path: 'products',
          query: params,
        });
        
        const products = (productsResponse.body as any).products || [];
        totalProducts += products.length;
        
        for (const product of products) {
          // Extract tags
          if (product.tags) {
            product.tags.split(',').forEach((tag: string) => {
              const trimmed = tag.trim();
              if (trimmed) allTags.add(trimmed);
            });
          }
          
          // Extract product type
          if (product.product_type) {
            productTypes.add(product.product_type);
          }
          
          // Extract vendor
          if (product.vendor) {
            vendors.add(product.vendor);
          }
          
          // Sample variants (collect examples from different product types)
          if (product.variants && variantExamples.length < 50) {
            for (const variant of product.variants) {
              if (variant.title && variant.price) {
                variantExamples.push({
                  product_type: product.product_type || 'Unknown',
                  size: variant.title,
                  price: parseFloat(variant.price),
                  sku_pattern: variant.sku || 'NO_SKU',
                });
              }
            }
          }
        }
        
        // Check pagination
        const linkHeader = productsResponse.headers?.link;
        if (linkHeader && typeof linkHeader === 'string' && linkHeader.includes('rel="next"')) {
          // Extract next page parameters
          const nextMatch = linkHeader.match(/page_info=([^&>]+)/);
          if (nextMatch) {
            params = { limit: 250, page_info: nextMatch[1] };
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
        
        logger?.info('📊 [ShopifyFetch] Progress', { 
          products_fetched: totalProducts,
          tags_found: allTags.size,
          types_found: productTypes.size,
        });
      }
      
      logger?.info('✅ [ShopifyFetch] Catalog fetch complete', {
        collections: allCollections.length,
        total_products: totalProducts,
        unique_tags: allTags.size,
        product_types: productTypes.size,
        vendors: vendors.size,
      });
      
      return {
        collections: allCollections,
        all_tags: Array.from(allTags).sort(),
        product_types: Array.from(productTypes).sort(),
        vendors: Array.from(vendors).sort(),
        sample_variants: variantExamples.slice(0, 20),
        total_products: totalProducts,
      };
      
    } catch (error) {
      logger?.error('❌ [ShopifyFetch] Error fetching catalog', { error });
      throw error;
    }
  },
});
