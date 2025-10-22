import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Shopify Integration Tool
 * 
 * Creates complete product listings in Shopify with:
 * - Title, description, meta descriptions
 * - Product images
 * - Variants with SKUs and pricing
 * - Tags and collections
 * - Sales channel assignments
 */

// Initialize Shopify API client
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

export const createShopifyProductTool = createTool({
  id: "create-shopify-product",
  description: "Creates a complete product listing in Shopify with all fields, variants, and images",
  
  inputSchema: z.object({
    title: z.string().describe("Product title"),
    description: z.string().describe("Product description (HTML formatted)"),
    meta_description: z.string().describe("SEO meta description"),
    url_handle: z.string().describe("URL-friendly product handle"),
    product_type: z.string().describe("Product type (e.g., 'DTF Design')"),
    vendor: z.string().describe("Vendor name"),
    tags: z.array(z.string()).describe("Product tags"),
    variants: z.array(z.object({
      sku: z.string(),
      size: z.string(),
      price: z.number(),
      inventory_quantity: z.number(),
    })).describe("Product variants"),
    images: z.array(z.object({
      name: z.string(),
      content: z.string().describe("Base64 encoded image"),
      mime_type: z.string(),
    })).describe("Product images"),
    collection_id: z.string().optional().describe("Shopify collection ID"),
  }),
  
  outputSchema: z.object({
    product_id: z.string(),
    product_url: z.string(),
    variant_ids: z.array(z.string()),
    success: z.boolean(),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🛍️ [Shopify] Creating product', { 
      title: context.title,
      variant_count: context.variants.length,
      image_count: context.images.length,
    });
    
    try {
      const shopify = await getShopifyClient();
      const session = shopify.session.customAppSession(process.env.SHOPIFY_STORE_URL!);
      const client = new shopify.clients.Rest({ session });
      
      // Step 1: Upload images to Shopify and get URLs
      logger?.info('📸 [Shopify] Uploading images', { count: context.images.length });
      
      const uploadedImageUrls: string[] = [];
      
      for (const image of context.images) {
        try {
          // Shopify expects images to be uploaded as attachments (base64) or URLs
          // We'll use the Admin API's staged uploads for larger files
          const imageBuffer = Buffer.from(image.content, 'base64');
          
          // For simplicity, we'll use direct base64 attachment
          // In production, consider using staged uploads for files >10MB
          uploadedImageUrls.push(`data:${image.mime_type};base64,${image.content}`);
        } catch (uploadError) {
          logger?.error('❌ [Shopify] Error preparing image', { error: uploadError, image_name: image.name });
        }
      }
      
      // Step 2: Create product with variants
      logger?.info('📦 [Shopify] Creating product with variants');
      
      const productData: any = {
        title: context.title,
        body_html: context.description,
        vendor: context.vendor,
        product_type: context.product_type,
        tags: context.tags.join(', '),
        handle: context.url_handle,
        metafields_global_title_tag: context.title,
        metafields_global_description_tag: context.meta_description,
        status: 'active',
        images: uploadedImageUrls.map((src, index) => ({
          src,
          position: index + 1,
        })),
        variants: context.variants.map(variant => ({
          title: variant.size,
          price: variant.price.toString(),
          sku: variant.sku,
          inventory_quantity: variant.inventory_quantity,
          inventory_management: 'shopify',
          fulfillment_service: 'manual',
        })),
      };
      
      const response = await client.post({
        path: 'products',
        data: { product: productData },
      });
      
      const product = (response.body as any).product;
      
      logger?.info('✅ [Shopify] Product created', {
        product_id: product.id,
        title: product.title,
        variant_count: product.variants.length,
      });
      
      // Step 3: Add to collection if specified
      if (context.collection_id) {
        try {
          logger?.info('📂 [Shopify] Adding product to collection', { collection_id: context.collection_id });
          
          await client.post({
            path: 'collects',
            data: {
              collect: {
                product_id: product.id,
                collection_id: context.collection_id,
              },
            },
          });
          
          logger?.info('✅ [Shopify] Product added to collection');
        } catch (collectionError) {
          logger?.warn('⚠️ [Shopify] Could not add to collection', { error: collectionError });
          // Don't fail the whole operation if collection assignment fails
        }
      }
      
      const product_url = `https://${process.env.SHOPIFY_STORE_URL}/products/${product.handle}`;
      const variant_ids = product.variants.map((v: any) => v.id.toString());
      
      logger?.info('🎉 [Shopify] Product creation complete', {
        product_id: product.id,
        product_url,
      });
      
      return {
        product_id: product.id.toString(),
        product_url,
        variant_ids,
        success: true,
      };
      
    } catch (error) {
      logger?.error('❌ [Shopify] Error creating product', { error });
      throw error;
    }
  },
});
