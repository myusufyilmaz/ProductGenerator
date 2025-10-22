import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { loadShopifyConfig, type Collection } from "../config/shopify-config";

/**
 * Collection Matching Tool
 * 
 * Matches product to the most appropriate Shopify collection based on:
 * - Detected labels/objects from vision AI
 * - Folder path hints
 * - Keyword scoring algorithm
 * 
 * NO AI HALLUCINATION - only returns collections from your predefined list
 */

export const matchProductToCollectionTool = createTool({
  id: "match-product-to-collection",
  description: "Matches a product to the best Shopify collection using keyword scoring",
  
  inputSchema: z.object({
    folder_path: z.string().describe("Google Drive folder path (e.g., 'DTF Designs/Baseball-Team-Logo')"),
    labels: z.array(z.string()).describe("Labels detected by vision AI"),
    detected_text: z.array(z.string()).optional().describe("Text detected in images"),
    product_type: z.string().describe("Product type (DTF, POD, etc.)"),
  }),
  
  outputSchema: z.object({
    collection_id: z.string(),
    collection_name: z.string(),
    tags_required: z.array(z.string()),
    confidence: z.number().describe("Confidence score 0-100"),
    reasoning: z.string().describe("Why this collection was chosen"),
    matched_keywords: z.array(z.string()).describe("Keywords that matched"),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🎯 [CollectionMatching] Matching product to collection', { 
      folder_path: context.folder_path,
      labels_count: context.labels.length,
      product_type: context.product_type,
    });
    
    try {
      const config = loadShopifyConfig();
      
      // Extract hints from folder path
      const folderHints = context.folder_path.toLowerCase().split('/').flatMap(part => 
        part.split(/[-_\s]+/).filter(w => w.length > 2)
      );
      
      // Combine all searchable text
      const searchableTerms = [
        ...context.labels.map(l => l.toLowerCase()),
        ...folderHints,
        ...(context.detected_text || []).map(t => t.toLowerCase()),
        context.product_type.toLowerCase(),
      ];
      
      logger?.info('🔍 [CollectionMatching] Searchable terms', { 
        terms: searchableTerms,
        term_count: searchableTerms.length,
      });
      
      // Score each collection
      const scores: Array<{
        collection: Collection;
        score: number;
        matched_keywords: string[];
      }> = [];
      
      for (const collection of config.collections) {
        let score = 0;
        const matched_keywords: string[] = [];
        
        // Check each keyword in the collection
        for (const keyword of collection.keywords) {
          const keywordLower = keyword.toLowerCase();
          
          // Check if any searchable term contains this keyword (or vice versa)
          for (const term of searchableTerms) {
            if (term.includes(keywordLower) || keywordLower.includes(term)) {
              score += collection.boost_score || 1;
              matched_keywords.push(keyword);
              break;  // Count each keyword only once
            }
          }
        }
        
        // Bonus points for exact product type match in folder path
        if (context.folder_path.toLowerCase().includes(context.product_type.toLowerCase())) {
          const channelTag = collection.tags_required.find(tag => tag.startsWith('channel:'));
          if (channelTag && channelTag.toLowerCase().includes(context.product_type.toLowerCase())) {
            score += 2;
            matched_keywords.push(`${context.product_type} (channel match)`);
          }
        }
        
        if (score > 0) {
          scores.push({
            collection,
            score,
            matched_keywords,
          });
        }
      }
      
      // Sort by score descending
      scores.sort((a, b) => b.score - a.score);
      
      logger?.info('📊 [CollectionMatching] Collection scores', { 
        scores: scores.map(s => ({ 
          name: s.collection.name, 
          score: s.score,
          keywords: s.matched_keywords,
        })),
      });
      
      if (scores.length === 0) {
        // No matches - return a low-confidence default
        logger?.warn('⚠️ [CollectionMatching] No collection matches found, using default');
        
        // Try to find a collection matching the product type
        const defaultCollection = config.collections.find(c => 
          c.tags_required.some(tag => tag.includes(context.product_type.toLowerCase()))
        ) || config.collections[0];
        
        return {
          collection_id: defaultCollection.id,
          collection_name: defaultCollection.name,
          tags_required: defaultCollection.tags_required,
          confidence: 30,  // Low confidence
          reasoning: `No strong keyword matches found. Defaulted to ${defaultCollection.name} based on product type.`,
          matched_keywords: [],
        };
      }
      
      const best = scores[0];
      const totalKeywords = best.collection.keywords.length;
      const matchedCount = best.matched_keywords.length;
      
      // Calculate confidence percentage
      const confidence = Math.min(100, Math.round((best.score / totalKeywords) * 100));
      
      const reasoning = `Matched ${matchedCount} keywords: ${best.matched_keywords.slice(0, 3).join(', ')}${matchedCount > 3 ? '...' : ''}. Score: ${best.score}/${totalKeywords} possible`;
      
      logger?.info('✅ [CollectionMatching] Best match found', {
        collection: best.collection.name,
        confidence,
        matched_keywords: best.matched_keywords,
      });
      
      return {
        collection_id: best.collection.id,
        collection_name: best.collection.name,
        tags_required: best.collection.tags_required,
        confidence,
        reasoning,
        matched_keywords: best.matched_keywords,
      };
      
    } catch (error) {
      logger?.error('❌ [CollectionMatching] Error matching collection', { error });
      throw error;
    }
  },
});
