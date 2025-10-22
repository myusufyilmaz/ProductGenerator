import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";

/**
 * SEO Optimization Tool
 * 
 * Uses GPT-4o-mini (cost-effective) to create SEO-optimized meta descriptions and tags
 * Focuses on search intent, keywords, and CTR optimization
 */

const openai = createOpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export const seoOptimizationTool = createTool({
  id: "seo-optimization",
  description: "Creates SEO-optimized meta descriptions and search tags for products",
  
  inputSchema: z.object({
    product_title: z.string(),
    description: z.string(),
    visual_features: z.array(z.string()).describe("Key visual elements from image analysis"),
    theme: z.string().describe("Product theme (e.g., 'sports', 'EMT', 'animals')"),
    target_audience: z.string().optional(),
  }),
  
  outputSchema: z.object({
    meta_description: z.string().describe("SEO meta description (150-160 chars)"),
    search_keywords: z.array(z.string()).describe("Primary search keywords"),
    suggested_tags: z.array(z.string()).describe("Additional product tags for discoverability"),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔍 [SEO] Optimizing product for search', { 
      title: context.product_title,
      theme: context.theme,
    });
    
    try {
      const model = openai.chat("gpt-4o-mini");
      
      const prompt = `Create SEO optimization for this product:

Title: ${context.product_title}
Description: ${context.description.substring(0, 500)}
Visual Features: ${context.visual_features.join(', ')}
Theme: ${context.theme}
${context.target_audience ? `Target Audience: ${context.target_audience}` : ''}

Tasks:
1. Write a compelling meta description (150-160 characters) that:
   - Includes primary keyword naturally
   - Has a call-to-action or benefit
   - Optimizes for click-through rate
   - Stays under 160 characters

2. Identify 5-8 primary search keywords people would use to find this

3. Suggest 8-12 additional tags for product discoverability

Return ONLY valid JSON:
{
  "meta_description": "...",
  "search_keywords": ["keyword1", "keyword2", ...],
  "suggested_tags": ["tag1", "tag2", ...]
}`;

      const { text } = await model.doGenerate({
        inputFormat: "messages",
        mode: {
          type: "regular",
        },
        prompt: [
          {
            role: "user",
            content: [{ type: "text", text: prompt }],
          },
        ],
      });
      
      if (!text) {
        throw new Error('No response from model');
      }
      
      logger?.info('📝 [SEO] Raw response received', { length: text.length });
      
      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const result = JSON.parse(jsonMatch[0]);
      
      // Validate meta description length
      if (result.meta_description.length > 160) {
        result.meta_description = result.meta_description.substring(0, 157) + '...';
      }
      
      logger?.info('✅ [SEO] Optimization complete', {
        meta_length: result.meta_description.length,
        keywords_count: result.search_keywords.length,
        tags_count: result.suggested_tags.length,
      });
      
      return result;
      
    } catch (error) {
      logger?.error('❌ [SEO] Optimization failed', { error });
      
      // Fallback to basic SEO
      return {
        meta_description: `${context.product_title.substring(0, 140)} - Shop now!`,
        search_keywords: context.visual_features.slice(0, 5),
        suggested_tags: [...context.visual_features, context.theme],
      };
    }
  },
});
