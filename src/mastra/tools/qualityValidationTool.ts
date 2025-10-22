import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { loadShopifyConfigSync } from "../config/shopify-config";

/**
 * Quality Validation Tool
 * 
 * Validates generated content quality with:
 * - Confidence scoring
 * - Anti-repetition checks
 * - Completeness verification
 * - Brand consistency checks
 */

export const qualityValidationTool = createTool({
  id: "quality-validation",
  description: "Validates product listing quality with confidence scoring and repetition detection",
  
  inputSchema: z.object({
    title: z.string(),
    description: z.string(),
    meta_description: z.string(),
    tags: z.array(z.string()),
    collection_match_confidence: z.number().describe("Collection matching confidence (0-100)"),
    has_images: z.boolean(),
    variant_count: z.number(),
    recent_descriptions: z.array(z.string()).optional().describe("Recent product descriptions for repetition check"),
  }),
  
  outputSchema: z.object({
    overall_confidence: z.number().describe("Overall quality confidence (0-100)"),
    status: z.enum(["auto_publish", "review", "reject"]),
    issues: z.array(z.object({
      severity: z.enum(["critical", "warning", "info"]),
      category: z.string(),
      message: z.string(),
    })),
    quality_scores: z.object({
      content_quality: z.number(),
      completeness: z.number(),
      uniqueness: z.number(),
      seo_readiness: z.number(),
    }),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔍 [Quality] Validating product listing', { title: context.title });
    
    const issues: Array<{ severity: "critical" | "warning" | "info"; category: string; message: string }> = [];
    const scores = {
      content_quality: 100,
      completeness: 100,
      uniqueness: 100,
      seo_readiness: 100,
    };
    
    // 1. Completeness Checks
    if (!context.title || context.title.length < 10) {
      issues.push({
        severity: "critical",
        category: "completeness",
        message: "Title too short or missing",
      });
      scores.completeness -= 30;
    }
    
    if (!context.description || context.description.length < 100) {
      issues.push({
        severity: "critical",
        category: "completeness",
        message: "Description too short",
      });
      scores.completeness -= 30;
    }
    
    if (!context.has_images) {
      issues.push({
        severity: "critical",
        category: "completeness",
        message: "No product images",
      });
      scores.completeness -= 40;
    }
    
    if (context.variant_count === 0) {
      issues.push({
        severity: "warning",
        category: "completeness",
        message: "No variants defined",
      });
      scores.completeness -= 20;
    }
    
    // 2. SEO Checks
    if (context.meta_description.length > 160) {
      issues.push({
        severity: "warning",
        category: "seo",
        message: "Meta description too long",
      });
      scores.seo_readiness -= 15;
    }
    
    if (context.meta_description.length < 120) {
      issues.push({
        severity: "info",
        category: "seo",
        message: "Meta description could be longer for better SEO",
      });
      scores.seo_readiness -= 5;
    }
    
    if (context.tags.length < 3) {
      issues.push({
        severity: "warning",
        category: "seo",
        message: "Insufficient tags for discoverability",
      });
      scores.seo_readiness -= 15;
    }
    
    // 3. Content Quality Checks
    const descLower = context.description.toLowerCase();
    
    // Check for generic/overused phrases
    const genericPhrases = [
      "perfect for",
      "great gift",
      "high quality",
      "premium quality",
      "best choice",
      "don't miss out",
      "limited time",
    ];
    
    const foundGeneric = genericPhrases.filter(phrase => descLower.includes(phrase));
    if (foundGeneric.length > 2) {
      issues.push({
        severity: "warning",
        category: "content_quality",
        message: `Overuse of generic phrases: ${foundGeneric.join(', ')}`,
      });
      scores.content_quality -= 20;
    }
    
    // Check description length
    if (context.description.length > 500) {
      issues.push({
        severity: "info",
        category: "content_quality",
        message: "Description might be too long for mobile users",
      });
      scores.content_quality -= 5;
    }
    
    // 4. Anti-Repetition Check
    if (context.recent_descriptions && context.recent_descriptions.length > 0) {
      const currentWords = new Set(context.description.toLowerCase().split(/\s+/));
      
      for (const recentDesc of context.recent_descriptions) {
        const recentWords = new Set(recentDesc.toLowerCase().split(/\s+/));
        const commonWords = [...currentWords].filter(word => 
          recentWords.has(word) && word.length > 5
        );
        
        const similarityRatio = commonWords.length / Math.min(currentWords.size, recentWords.size);
        
        if (similarityRatio > 0.6) {
          issues.push({
            severity: "warning",
            category: "uniqueness",
            message: `Description too similar to recent product (${Math.round(similarityRatio * 100)}% overlap)`,
          });
          scores.uniqueness -= 30;
          break;
        } else if (similarityRatio > 0.4) {
          issues.push({
            severity: "info",
            category: "uniqueness",
            message: "Some phrases repeated from recent products",
          });
          scores.uniqueness -= 10;
        }
      }
    }
    
    // 5. Collection Match Confidence Integration
    if (context.collection_match_confidence < 70) {
      issues.push({
        severity: "warning",
        category: "categorization",
        message: "Low collection matching confidence",
      });
      scores.content_quality -= 15;
    }
    
    // Calculate overall confidence
    const avgScore = (
      scores.content_quality +
      scores.completeness +
      scores.uniqueness +
      scores.seo_readiness
    ) / 4;
    
    // Weight by collection confidence
    const overall_confidence = Math.round(
      (avgScore * 0.7) + (context.collection_match_confidence * 0.3)
    );
    
    // Determine status based on thresholds
    const config = loadShopifyConfigSync();
    const thresholds = config.confidence_thresholds;
    
    let status: "auto_publish" | "review" | "reject";
    if (overall_confidence >= thresholds.auto_publish) {
      status = "auto_publish";
    } else if (overall_confidence >= thresholds.quarantine) {
      status = "review";
    } else {
      status = "reject";
    }
    
    logger?.info('✅ [Quality] Validation complete', {
      overall_confidence,
      status,
      issues_count: issues.length,
    });
    
    return {
      overall_confidence,
      status,
      issues,
      quality_scores: scores,
    };
  },
});
