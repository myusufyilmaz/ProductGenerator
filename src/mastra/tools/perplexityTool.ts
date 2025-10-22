import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Perplexity Research Tool
 * 
 * Uses Perplexity AI to research current trends, terminology, and market context
 * for detected design elements. This adds real-world context to make descriptions
 * unique and timely.
 */

export const researchProductTrendsTool = createTool({
  id: "research-product-trends",
  description: "Researches current trends and context for product elements using Perplexity AI",
  
  inputSchema: z.object({
    primary_subjects: z.array(z.string()).describe("Main subjects detected in the product"),
    product_type: z.string().describe("Product type (DTF, POD, etc.)"),
    detected_text: z.array(z.string()).optional().describe("Text found in the design"),
  }),
  
  outputSchema: z.object({
    trends: z.array(z.string()).describe("Current trends related to the subjects"),
    keywords: z.array(z.string()).describe("Trending keywords and terminology"),
    context: z.string().describe("Market context and positioning suggestions"),
    creative_angles: z.array(z.string()).describe("Suggested creative angles for descriptions"),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔬 [Perplexity] Researching product trends', { 
      subjects: context.primary_subjects,
      product_type: context.product_type,
    });
    
    try {
      // Build research query
      const subjects = context.primary_subjects.join(', ');
      const textContext = context.detected_text && context.detected_text.length > 0
        ? ` with text "${context.detected_text.join(', ')}"`
        : '';
      
      const query = `What are current 2025 trends, popular terminology, and market positioning for ${context.product_type} products featuring ${subjects}${textContext}? Focus on: 1) Trending keywords people use when searching, 2) Popular design styles, 3) Target audience preferences, 4) Unique selling angles.`;

      logger?.info('📝 [Perplexity] Query', { query });

      // Call Perplexity API
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'You are a market research expert specializing in product trends and SEO. Provide concise, actionable insights about current trends and terminology.',
            },
            {
              role: 'user',
              content: query,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.statusText}`);
      }

      const data = await response.json();
      const researchText = data.choices[0]?.message?.content || '';

      logger?.info('📊 [Perplexity] Research complete', { 
        response_length: researchText.length 
      });

      // Parse research into structured data
      // This is a simplified extraction - in production you might use structured output
      const lines = researchText.split('\n').filter((l: string) => l.trim().length > 0);
      
      const trends: string[] = [];
      const keywords: string[] = [];
      const creative_angles: string[] = [];
      
      for (const line of lines) {
        const lower = line.toLowerCase();
        if (lower.includes('trend') || lower.includes('popular') || lower.includes('growing')) {
          trends.push(line.replace(/^[-•*]\s*/, '').trim());
        } else if (lower.includes('keyword') || lower.includes('search') || lower.includes('term')) {
          const extracted = line.match(/["']([^"']+)["']/g);
          if (extracted) {
            keywords.push(...extracted.map((k: string) => k.replace(/["']/g, '')));
          }
        } else if (lower.includes('angle') || lower.includes('positioning') || lower.includes('appeal')) {
          creative_angles.push(line.replace(/^[-•*]\s*/, '').trim());
        }
      }

      // Fallback: extract keywords from subjects if research didn't provide enough
      if (keywords.length < 3) {
        keywords.push(...context.primary_subjects.map(s => s.toLowerCase()));
      }

      return {
        trends: trends.length > 0 ? trends : [`${subjects} designs are popular for ${context.product_type} products`],
        keywords: Array.from(new Set(keywords)).slice(0, 10),
        context: researchText.substring(0, 500),
        creative_angles: creative_angles.length > 0 
          ? creative_angles 
          : [
              `Perfect for ${subjects} enthusiasts`,
              `Unique ${subjects} design`,
              `Trending ${subjects} style for 2025`,
            ],
      };
      
    } catch (error) {
      logger?.error('❌ [Perplexity] Error researching trends', { error });
      
      // Return fallback data instead of failing
      return {
        trends: [`${context.primary_subjects.join(', ')} designs`],
        keywords: context.primary_subjects.map(s => s.toLowerCase()),
        context: `Product featuring ${context.primary_subjects.join(', ')}`,
        creative_angles: [
          `Unique design featuring ${context.primary_subjects[0]}`,
          `Perfect for ${context.product_type} applications`,
        ],
      };
    }
  },
});
