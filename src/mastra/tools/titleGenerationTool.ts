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
    title: z.string().describe("Customer-friendly product title (40-60 characters)"),
    alternative_titles: z.array(z.string()).optional().describe("Alternative title options"),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('📝 [TitleGen] Generating product title', { 
      detected_text: context.detected_text,
      theme: context.collection_theme,
    });
    
    try {
      const { generateText } = await import("ai");
      
      const prompt = `Create a product title for a ${context.product_type}.

Text on design: ${context.detected_text.join(', ')}
Theme: ${context.collection_theme}

Rules:
- Use the main phrase from the design (ignore random numbers like "00" or decorative elements)
- Add the theme: ${context.collection_theme}
- Add "DTF Transfer" at the end
- 40-60 characters total
- Natural, searchable title

Examples:
"Pitches Be Crazy Baseball DTF Transfer"
"Baseball Mama Life DTF Transfer"
"Strike Out Cancer Baseball DTF Transfer"

Return ONLY the title, nothing else.`;

      const response = await generateText({
        model: openai('gpt-4o'),
        prompt,
        temperature: 0.5,
      });
      
      // Clean up response - remove quotes, extra whitespace
      let title = response.text.trim()
        .replace(/^["'`]/g, '')
        .replace(/["'`]$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // FALLBACK: If empty, create title from detected text
      if (!title || title.length === 0) {
        logger?.warn('⚠️ [TitleGen] Empty response, using fallback');
        
        // Filter out pure numbers and short fragments
        const meaningfulText = context.detected_text
          .filter(text => !/^\d+$/.test(text)) // Remove pure numbers like "00"
          .filter(text => text.length > 2)      // Remove single chars
          .join(' ')
          .substring(0, 30);
        
        title = `${meaningfulText} ${context.collection_theme} DTF Transfer`.trim();
      }
      
      logger?.info('✅ [TitleGen] Title generated', { 
        title,
        length: title.length,
      });
      
      return {
        title,
        alternative_titles: [],
      };
      
    } catch (error: any) {
      logger?.error('❌ [TitleGen] Error generating title', { error: error.message });
      throw error;
    }
  },
});
