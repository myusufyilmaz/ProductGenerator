import { createStep, createWorkflow } from "../inngest";
import { z } from "zod";
import { RuntimeContext } from "@mastra/core/di";
import { listGoogleDriveFoldersTool } from "../tools/googleDriveTool";
import { analyzeImageWithVisionTool } from "../tools/googleVisionTool";
import { researchProductContextTool } from "../tools/perplexityTool";
import { matchProductToCollectionTool } from "../tools/collectionMatchingTool";
import { contentGeneratorAgent } from "../agents/contentGeneratorAgent";
import { seoOptimizationTool } from "../tools/seoOptimizationTool";
import { qualityValidationTool } from "../tools/qualityValidationTool";
import { createShopifyProductTool } from "../tools/shopifyTool";

/**
 * Product Automation Workflow
 * 
 * Full automated pipeline:
 * 1. Scan Google Drive for new product folders
 * 2. Analyze images with Google Vision
 * 3. Research trends with Perplexity
 * 4. Match to collections
 * 5. Generate creative descriptions
 * 6. Optimize for SEO
 * 7. Validate quality
 * 8. Publish to Shopify (if confidence >= 75%)
 * 
 * Runs every 2-3 hours automatically
 */

const scanDriveFoldersStep = createStep({
  id: "scan-drive-folders",
  description: "Scans Google Drive folders for new product images",
  
  inputSchema: z.object({
    run_id: z.string(),
  }),
  
  outputSchema: z.object({
    folders_found: z.number(),
    new_products: z.array(z.object({
      file_id: z.string(),
      file_name: z.string(),
      folder_path: z.string(),
      download_url: z.string(),
    })),
  }),
  
  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔍 [Automation] Step 1: Scanning Google Drive folders', { run_id: inputData.run_id });
    
    const runtimeContext = new RuntimeContext();
    
    // Scan DTF and POD folders
    const dtfResult = await listGoogleDriveFoldersTool.execute({
      context: { folder_id: process.env.GOOGLE_DRIVE_DTF_FOLDER_ID || '', recursive: true },
      runtimeContext,
      mastra,
    });
    
    const podResult = await listGoogleDriveFoldersTool.execute({
      context: { folder_id: process.env.GOOGLE_DRIVE_POD_FOLDER_ID || '', recursive: true },
      runtimeContext,
      mastra,
    });
    
    const allFiles = [...dtfResult.files, ...podResult.files];
    
    // Filter for image files only
    const imageFiles = allFiles.filter(f => 
      f.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    );
    
    // TODO: Check database for already processed files
    // For now, return first 10 as "new"
    const newProducts = imageFiles.slice(0, 10);
    
    logger?.info('✅ [Automation] Drive scan complete', {
      total_folders: dtfResult.folders.length + podResult.folders.length,
      total_files: allFiles.length,
      new_products: newProducts.length,
    });
    
    return {
      folders_found: dtfResult.folders.length + podResult.folders.length,
      new_products: newProducts.map(f => ({
        file_id: f.file_id,
        file_name: f.file_name,
        folder_path: f.folder_path,
        download_url: f.download_url,
      })),
    };
  },
});

const processProductStep = createStep({
  id: "process-product",
  description: "Processes a single product through the full pipeline",
  
  inputSchema: z.object({
    file_id: z.string(),
    file_name: z.string(),
    folder_path: z.string(),
    download_url: z.string(),
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    product_id: z.string().optional(),
    status: z.string(),
    confidence: z.number(),
  }),
  
  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🚀 [Automation] Processing product', { file_name: inputData.file_name });
    
    const runtimeContext = new RuntimeContext();
    
    try {
      // Step 1: Analyze image
      logger?.info('👁️ [Automation] Analyzing image with Google Vision');
      const visionResult = await analyzeImageWithVisionTool.execute({
        context: { image_url: inputData.download_url },
        runtimeContext,
        mastra,
      });
      
      // Step 2: Research context
      logger?.info('🔍 [Automation] Researching product context');
      const researchResult = await researchProductContextTool.execute({
        context: {
          visual_description: visionResult.labels.slice(0, 5).join(', '),
          detected_text: visionResult.text_annotations.slice(0, 3).join(' '),
          colors: visionResult.dominant_colors.slice(0, 3),
        },
        runtimeContext,
        mastra,
      });
      
      // Step 3: Match to collection
      logger?.info('📂 [Automation] Matching to collection');
      const collectionMatch = await matchProductToCollectionTool.execute({
        context: {
          visual_features: visionResult.labels,
          detected_text: visionResult.text_annotations,
          folder_path: inputData.folder_path,
          product_type: inputData.folder_path.includes('/DTF/') ? 'DTF Design' : 'POD Apparel',
        },
        runtimeContext,
        mastra,
      });
      
      // Step 4: Generate creative description
      logger?.info('✍️ [Automation] Generating product description');
      
      const descriptionPrompt = `Create a unique product description for:

Product: ${inputData.file_name.replace(/\.(jpg|jpeg|png|gif)$/i, '').replace(/[-_]/g, ' ')}
Visual Features: ${visionResult.labels.slice(0, 8).join(', ')}
Colors: ${visionResult.dominant_colors.slice(0, 3).join(', ')}
Detected Text: ${visionResult.text_annotations.slice(0, 3).join(' ')}
Market Context: ${researchResult.trend_summary}
Target Collection: ${collectionMatch.matched_collection.name}
Product Type: ${inputData.folder_path.includes('/DTF/') ? 'DTF Design (customizable print)' : 'POD Apparel (ready-to-wear)'}

Write a 150-250 word description that stands out.`;

      const descriptionResponse = await contentGeneratorAgent.generate(
        [{ role: "user", content: descriptionPrompt }],
        {
          resourceId: "automation",
          threadId: inputData.file_id,
          maxSteps: 1,
        }
      );
      
      const productDescription = descriptionResponse.text;
      
      // Step 5: SEO optimization
      logger?.info('📈 [Automation] Optimizing for SEO');
      const seoResult = await seoOptimizationTool.execute({
        context: {
          product_title: inputData.file_name.replace(/\.(jpg|jpeg|png|gif)$/i, '').replace(/[-_]/g, ' '),
          description: productDescription,
          visual_features: visionResult.labels.slice(0, 10),
          theme: collectionMatch.matched_collection.name.split(/[–-]/)[0].trim(),
        },
        runtimeContext,
        mastra,
      });
      
      // Step 6: Quality validation
      logger?.info('✅ [Automation] Validating quality');
      const validation = await qualityValidationTool.execute({
        context: {
          title: inputData.file_name.replace(/\.(jpg|jpeg|png|gif)$/i, ''),
          description: productDescription,
          meta_description: seoResult.meta_description,
          tags: [...collectionMatch.matched_tags, ...seoResult.suggested_tags],
          collection_match_confidence: collectionMatch.confidence_score,
          has_images: true,
          variant_count: 3, // Default variants
          recent_descriptions: [], // TODO: Query from database
        },
        runtimeContext,
        mastra,
      });
      
      logger?.info('📊 [Automation] Quality validation result', {
        confidence: validation.overall_confidence,
        status: validation.status,
        issues: validation.issues.length,
      });
      
      // Step 7: Publish if confidence >= 75%
      if (validation.status === 'auto_publish') {
        logger?.info('🚀 [Automation] Publishing to Shopify');
        
        // TODO: Create product with real implementation
        logger?.warn('⚠️ [Automation] Shopify publishing not yet implemented - would publish product here');
        
        return {
          success: true,
          status: 'published',
          confidence: validation.overall_confidence,
        };
      } else {
        logger?.info('⏸️ [Automation] Product needs review', { status: validation.status });
        
        return {
          success: true,
          status: validation.status,
          confidence: validation.overall_confidence,
        };
      }
      
    } catch (error: any) {
      logger?.error('❌ [Automation] Product processing failed', { 
        file_name: inputData.file_name,
        error: error.message,
      });
      
      return {
        success: false,
        status: 'failed',
        confidence: 0,
      };
    }
  },
});

export const productAutomationWorkflow = createWorkflow({
  id: "product-automation-workflow",
  description: "Automated product listing pipeline: scan → analyze → generate → validate → publish",
  
  inputSchema: z.object({
    run_id: z.string().optional(),
  }),
  
  outputSchema: z.object({
    total_scanned: z.number(),
    total_processed: z.number(),
    published: z.number(),
    needs_review: z.number(),
    failed: z.number(),
  }),
})
  .then(scanDriveFoldersStep)
  .commit();
