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
    
    const prompt = `You are an expert e-commerce copywriter specializing in DTF designs and print-on-demand apparel.

Create a UNIQUE, CREATIVE product description for this ${context.collection} product:
- SKU: ${context.sku}
- Design Elements: ${context.design_elements.join(', ')}
- Colors: ${context.colors.join(', ')}
- Text: ${context.detected_text}
- Market Trends: ${context.trends}

Writing Rules:
- NEVER use the same opening sentence twice
- Vary your style: sometimes playful, sometimes bold, sometimes nostalgic
- Use vivid imagery and sensory language
- Keep 150-250 words
- Write in second person or descriptive style
- NO generic phrases like "perfect for" or "great gift for"
- Focus on the FEELING the design evokes

Output Format:
Return ONLY the product description text, no formatting, no extra commentary.`;

    try {
      const { text } = await generateText({
        model: openai('gpt-4o'),
        prompt,
        maxTokens: 300,
        temperature: 0.9,
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
