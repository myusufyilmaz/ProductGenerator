import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * Content Generation Tool
 * 
 * Uses GPT-4o to create unique, creative product descriptions
 */

const openai = createOpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export const generateProductDescriptionTool = createTool({
  id: "generate-product-description",
  description: "Generates unique, creative product descriptions using GPT-4o",
  
  inputSchema: z.object({
    sku: z.string(),
    collection: z.string(),
    design_elements: z.array(z.string()),
    colors: z.array(z.string()),
    detected_text: z.string(),
    trends: z.string(),
  }),
  
  outputSchema: z.object({
    description: z.string(),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('✍️ [ContentGen] Generating product description', { sku: context.sku });
    
    const prompt = `Write a simple product description like you're texting a friend about this DTF transfer design.

Product details:
- Design says: "${context.detected_text}"
- Theme: ${context.collection}
- Colors: ${context.colors.join(', ')}

Write 2-3 short sentences. Be casual and direct. Just describe what it is and what it's good for. No flowery language, no hype.

Examples of good tone:
"This retro baseball design has that vintage vibe everyone loves. Great for jerseys, totes, or team shirts."
"Bold mama bear graphic with floral accents. Works on any color fabric."

Just the description, nothing else.`;

    try {
      const { text } = await generateText({
        model: openai('gpt-4o'),
        prompt,
        maxTokens: 150,
        temperature: 0.6,
      });
      
      logger?.info('✅ [ContentGen] Description generated', { 
        sku: context.sku,
        length: text.length 
      });
      
      return {
        description: text.trim(),
      };
    } catch (error: any) {
      logger?.error('❌ [ContentGen] Generation failed', { 
        sku: context.sku,
        error: error.message 
      });
      throw error;
    }
  },
});
