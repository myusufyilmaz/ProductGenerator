import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export const generateProductTitleTool = createTool({
  id: "generate-product-title",
  description: "Generates a customer-friendly, SEO-optimized product title based on image analysis and collection theme",
  
  inputSchema: z.object({
    detected_text: z.array(z.string()).describe("Text detected in the product image"),
    visual_labels: z.array(z.string()).describe("Visual elements from image analysis"),
    collection_theme: z.string().describe("Product collection/category (e.g., 'Baseball', 'Animals')"),
    product_type: z.string().describe("Product type (e.g., 'DTF Design', 'POD Apparel')"),
  }),
  
  outputSchema: z.object({
    title: z.string().describe("Customer-friendly product title (50-70 characters)"),
    alternative_titles: z.array(z.string()).describe("3 alternative title options"),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('📝 [TitleGen] Generating product title', { 
      detected_text: context.detected_text,
      theme: context.collection_theme,
    });
    
    try {
      const { generateText } = await import("ai");
      
      const prompt = `You are an e-commerce product naming expert. Generate a customer-friendly, SEO-optimized product title.

DETECTED TEXT IN IMAGE: ${context.detected_text.join(', ')}
VISUAL ELEMENTS: ${context.visual_labels.join(', ')}
COLLECTION THEME: ${context.collection_theme}
PRODUCT TYPE: ${context.product_type}

REQUIREMENTS:
1. Title must be 50-70 characters
2. Include the main text/phrase from the image if meaningful
3. Include the theme (${context.collection_theme})
4. Include product type (${context.product_type})
5. Be searchable - think about what customers would type
6. Be descriptive but concise
7. Use title case capitalization
8. NO SKU codes or technical jargon

GOOD EXAMPLES:
- "Home Run Hero Baseball DTF Transfer Design"
- "Vintage Baseball Diamond DTF Heat Transfer"
- "Strike Zone Champion Baseball Graphic Design"
- "Baseball Mom Life DTF Transfer Print"

BAD EXAMPLES:
- "BASEBALL10097134" (just SKU)
- "Design" (too generic)
- "Baseball Product" (not specific enough)

Generate ONE best title and 3 alternative options.`;

      const response = await generateText({
        model: openai('gpt-4o'),
        prompt,
        temperature: 0.7,
      });
      
      const lines = response.text.trim().split('\n').filter(line => line.trim());
      const title = lines[0].replace(/^["']|["']$/g, '').replace(/^\d+\.\s*/, '').trim();
      const alternatives = lines.slice(1, 4).map(line => 
        line.replace(/^["']|["']$/g, '').replace(/^\d+\.\s*/, '').trim()
      );
      
      logger?.info('✅ [TitleGen] Title generated', { 
        title,
        length: title.length,
      });
      
      return {
        title,
        alternative_titles: alternatives,
      };
      
    } catch (error: any) {
      logger?.error('❌ [TitleGen] Error generating title', { error: error.message });
      throw error;
    }
  },
});
