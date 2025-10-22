import { createStep, createWorkflow } from "../inngest";
import { z } from "zod";
import { RuntimeContext } from "@mastra/core/di";
import { listDriveFoldersTool, downloadFolderImagesTool } from "../tools/googleDriveTool";
import { analyzeProductImagesTool } from "../tools/googleVisionTool";
import { researchProductTrendsTool } from "../tools/perplexityTool";
import { matchProductToCollectionTool } from "../tools/collectionMatchingTool";
import { generateProductDescriptionTool } from "../tools/contentGenerationTool";
import { seoOptimizationTool } from "../tools/seoOptimizationTool";
import { qualityValidationTool } from "../tools/qualityValidationTool";
import { createShopifyProductTool } from "../tools/shopifyTool";

/**
 * Product Automation Workflow
 * 
 * Full automated pipeline:
 * 1. Scan Google Drive for new product folders
 * 2. Download and analyze images with Google Vision
 * 3. Research trends with Perplexity
 * 4. Match to collections
 * 5. Generate creative descriptions
 * 6. Optimize for SEO
 * 7. Validate quality
 * 8. Publish to Shopify (if confidence >= 75%)
 * 
 * Runs every 2 hours automatically
 */

const scanDriveFoldersStep = createStep({
  id: "scan-drive-folders",
  description: "Scans Google Drive folders for new product folders to process",
  
  inputSchema: z.object({
    run_id: z.string(),
  }),
  
  outputSchema: z.object({
    folders_found: z.number(),
    new_folders: z.array(z.object({
      folder_id: z.string(),
      folder_name: z.string(),
      folder_path: z.string(),
      folder_type: z.string(), // 'DTF' or 'POD'
    })),
  }),
  
  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔍 [Automation] Step 1: Scanning Google Drive folders', { run_id: inputData.run_id });
    
    const runtimeContext = new RuntimeContext();
    
    // Scan DTF and POD parent folders for subfolders using environment variable folder IDs
    const dtfFolderId = process.env.GOOGLE_DRIVE_DTF_FOLDER_ID;
    const podFolderId = process.env.GOOGLE_DRIVE_POD_FOLDER_ID;
    
    if (!dtfFolderId || !podFolderId) {
      logger?.error('❌ [Automation] Google Drive folder IDs not configured');
      return {
        folders_found: 0,
        new_folders: [],
      };
    }
    
    const dtfResult = await listDriveFoldersTool.execute({
      context: { 
        folder_id: dtfFolderId,
        folder_name: 'DTF Designs'
      },
      runtimeContext,
      mastra,
    });
    
    const podResult = await listDriveFoldersTool.execute({
      context: { 
        folder_id: podFolderId,
        folder_name: 'POD Apparel'
      },
      runtimeContext,
      mastra,
    });
    
    // Map folders with type information
    const dtfFolders = dtfResult.folders.map(f => ({
      folder_id: f.id,
      folder_name: f.name,
      folder_path: f.path,
      folder_type: 'DTF' as const,
    }));
    
    const podFolders = podResult.folders.map(f => ({
      folder_id: f.id,
      folder_name: f.name,
      folder_path: f.path,
      folder_type: 'POD' as const,
    }));
    
    const allFolders = [...dtfFolders, ...podFolders];
    
    // TODO: Check database for already processed folders
    // For now, return first 5 as "new"
    const newFolders = allFolders.slice(0, 5);
    
    logger?.info('✅ [Automation] Drive scan complete', {
      total_folders: allFolders.length,
      dtf_folders: dtfFolders.length,
      pod_folders: podFolders.length,
      new_folders: newFolders.length,
    });
    
    return {
      folders_found: allFolders.length,
      new_folders: newFolders,
    };
  },
});

const processProductStep = createStep({
  id: "process-product",
  description: "Processes a single product folder through the full pipeline",
  
  inputSchema: z.object({
    folder_id: z.string(),
    folder_name: z.string(),
    folder_path: z.string(),
    folder_type: z.string(),
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    product_id: z.string().optional(),
    status: z.string(),
    confidence: z.number(),
  }),
  
  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🚀 [Automation] Processing product folder', { folder_name: inputData.folder_name });
    
    const runtimeContext = new RuntimeContext();
    
    try {
      // Step 1: Download images from folder
      logger?.info('📥 [Automation] Downloading images from folder');
      const downloadResult = await downloadFolderImagesTool.execute({
        context: { 
          folder_id: inputData.folder_id,
          folder_name: inputData.folder_name,
        },
        runtimeContext,
        mastra,
      });
      
      if (downloadResult.images.length === 0) {
        logger?.warn('⚠️ [Automation] No images found in folder');
        return {
          success: false,
          status: 'no_images',
          confidence: 0,
        };
      }
      
      // Step 2: Analyze images with Google Vision
      logger?.info('👁️ [Automation] Analyzing images with Google Vision');
      const visionResult = await analyzeProductImagesTool.execute({
        context: { 
          images: downloadResult.images,
          sku: inputData.folder_name,
        },
        runtimeContext,
        mastra,
      });
      
      // Step 3: Research product context with Perplexity
      logger?.info('🔍 [Automation] Researching product trends');
      const researchResult = await researchProductTrendsTool.execute({
        context: {
          primary_subjects: visionResult.properties.primary_subjects,
          product_type: inputData.folder_type === 'DTF' ? 'DTF Design' : 'POD Apparel',
          detected_text: visionResult.detected_text,
        },
        runtimeContext,
        mastra,
      });
      
      // Step 4: Match to collection
      logger?.info('📂 [Automation] Matching to collection');
      const collectionMatch = await matchProductToCollectionTool.execute({
        context: {
          visual_features: visionResult.labels,
          detected_text: visionResult.detected_text.join(' '),
          folder_path: inputData.folder_path,
          product_type: inputData.folder_type === 'DTF' ? 'DTF Design' : 'POD Apparel',
        },
        runtimeContext,
        mastra,
      });
      
      // Step 5: Generate creative description
      logger?.info('✍️ [Automation] Generating product description');
      
      const descriptionPrompt = `Create a unique product description for:

Product: ${inputData.folder_name}
Visual Features: ${visionResult.labels.slice(0, 8).join(', ')}
Colors: ${visionResult.dominant_colors.slice(0, 3).map(c => c.hex).join(', ')}
Detected Text: ${visionResult.detected_text.slice(0, 3).join(' ')}
Market Trends: ${researchResult.trends.slice(0, 2).join(', ')}
Target Collection: ${collectionMatch.matched_collection.name}
Product Type: ${inputData.folder_type === 'DTF' ? 'DTF Design (customizable print)' : 'POD Apparel (ready-to-wear)'}

Write a 150-250 word description that stands out.`;

      const descriptionResponse = await contentGeneratorAgent.generate(
        [{ role: "user", content: descriptionPrompt }],
        {
          resourceId: "automation",
          threadId: inputData.folder_id,
          maxSteps: 1,
        }
      );
      
      const productDescription = descriptionResponse.text;
      
      // Step 6: SEO optimization
      logger?.info('📈 [Automation] Optimizing for SEO');
      const seoResult = await seoOptimizationTool.execute({
        context: {
          product_title: inputData.folder_name,
          description: productDescription,
          visual_features: visionResult.labels.slice(0, 10),
          theme: collectionMatch.matched_collection.name.split(/[–-]/)[0].trim(),
        },
        runtimeContext,
        mastra,
      });
      
      // Step 7: Quality validation
      logger?.info('✅ [Automation] Validating quality');
      
      // TODO: Query recent descriptions from database for anti-repetition check
      const validation = await qualityValidationTool.execute({
        context: {
          title: inputData.folder_name,
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
      
      // Step 8: Publish if confidence >= 75%
      if (validation.status === 'auto_publish') {
        logger?.info('🚀 [Automation] Publishing to Shopify');
        
        // TODO: Save to database first, then publish
        logger?.warn('⚠️ [Automation] Shopify publishing not yet implemented - would publish product here');
        
        // Log what would be published
        logger?.info('📦 [Automation] Product ready for publishing', {
          title: inputData.folder_name,
          collection: collectionMatch.matched_collection.name,
          confidence: validation.overall_confidence,
          tags_count: [...collectionMatch.matched_tags, ...seoResult.suggested_tags].length,
        });
        
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
        folder_name: inputData.folder_name,
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

const aggregateResultsStep = createStep({
  id: "aggregate-results",
  description: "Aggregate results from all processed products",
  
  inputSchema: z.object({
    folders_found: z.number(),
    processed_results: z.array(z.object({
      success: z.boolean(),
      status: z.string(),
      confidence: z.number(),
    })),
  }),
  
  outputSchema: z.object({
    total_scanned: z.number(),
    total_processed: z.number(),
    published: z.number(),
    needs_review: z.number(),
    failed: z.number(),
  }),
  
  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();
    const { folders_found, processed_results } = inputData;
    
    const published = processed_results.filter(r => r.status === 'published').length;
    const needs_review = processed_results.filter(r => r.status === 'review').length;
    const failed = processed_results.filter(r => !r.success).length;
    
    logger?.info('📊 [Automation] Run complete', {
      total_scanned: folders_found,
      total_processed: processed_results.length,
      published,
      needs_review,
      failed,
    });
    
    return {
      total_scanned: folders_found,
      total_processed: processed_results.length,
      published,
      needs_review,
      failed,
    };
  },
});

const processAllFoldersStep = createStep({
  id: "process-all-folders",
  description: "Process all new folders through the complete pipeline",
  
  inputSchema: z.object({
    folders_found: z.number(),
    new_folders: z.array(z.object({
      folder_id: z.string(),
      folder_name: z.string(),
      folder_path: z.string(),
      folder_type: z.string(),
    })),
  }),
  
  outputSchema: z.object({
    folders_found: z.number(),
    processed_results: z.array(z.object({
      success: z.boolean(),
      status: z.string(),
      confidence: z.number(),
    })),
  }),
  
  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();
    const { new_folders, folders_found } = inputData;
    
    logger?.info('🚀 [Automation] Processing all folders', { count: new_folders.length });
    
    const runtimeContext = new RuntimeContext();
    
    // Process each folder through the complete pipeline
    const results = await Promise.all(
      new_folders.map(async (folder) => {
        try {
          logger?.info(`📦 [Automation] Starting folder: ${folder.folder_name}`);
          
          // Step 2: Download images
          const images = await downloadFolderImagesTool.execute({
            context: { 
              folder_id: folder.folder_id,
              folder_name: folder.folder_name,
            },
            runtimeContext,
            mastra,
          });
          
          if (images.images.length === 0) {
            logger?.warn(`⚠️ [Automation] No images found in ${folder.folder_name}`);
            return { success: false, status: 'failed', confidence: 0 };
          }
          
          // Step 3: Analyze with Google Vision
          const analysis = await analyzeProductImagesTool.execute({
            context: { 
              images: images.images,
              sku: folder.folder_name,
            },
            runtimeContext,
            mastra,
          });
          
          // Extract simple formats for downstream tools
          const colorStrings = analysis.dominant_colors.map(c => c.hex);
          const textString = analysis.detected_text.join(' ');
          
          // Step 4: Research trends
          const trends = await researchProductTrendsTool.execute({
            context: {
              design_elements: analysis.labels,
              colors: colorStrings,
              detected_text: textString,
            },
            runtimeContext,
            mastra,
          });
          
          // Step 5: Match to collection
          const collectionMatch = await matchProductToCollectionTool.execute({
            context: {
              folder_path: folder.folder_path,
              labels: analysis.labels,
              detected_text: analysis.detected_text,
              product_type: folder.folder_type,
            },
            runtimeContext,
            mastra,
          });
          
          // Step 6: Generate content
          const contentResponse = await generateProductDescriptionTool.execute({
            context: {
              sku: folder.folder_name,
              collection: collectionMatch.matched_collection_name,
              design_elements: analysis.labels,
              colors: colorStrings,
              detected_text: textString,
              trends: trends.trend_summary,
            },
            runtimeContext,
            mastra,
          });
          
          // Step 7: SEO optimization
          const seoResult = await seoOptimizationTool.execute({
            context: {
              product_title: folder.folder_name,
              description: contentResponse.description,
              visual_features: analysis.labels,
              theme: collectionMatch.collection_name,
              target_audience: 'team parents, fans, enthusiasts',
            },
            runtimeContext,
            mastra,
          });
          
          // Ensure suggested_tags is an array (defensive handling)
          const suggestedTags = Array.isArray(seoResult?.suggested_tags) ? seoResult.suggested_tags : [];
          const allTags = [...collectionMatch.tags_required, ...suggestedTags];
          
          // Step 8: Quality validation
          const validation = await qualityValidationTool.execute({
            context: {
              title: folder.folder_name,
              description: contentResponse.description,
              seo_meta_description: seoResult?.meta_description || contentResponse.description.substring(0, 160),
              suggested_tags: allTags,
              collection_confidence: collectionMatch.confidence,
            },
            runtimeContext,
            mastra,
          });
          
          // Step 9: Publish if quality is high enough
          if (validation.overall_confidence >= 75) {
            await createShopifyProductTool.execute({
              context: {
                title: folder.folder_name,
                description: contentResponse.description,
                images: images.images,
                collection_id: collectionMatch.collection_id,
                tags: allTags,
                seo_title: seoResult?.seo_title || folder.folder_name,
                seo_meta_description: seoResult?.meta_description || contentResponse.description.substring(0, 160),
                product_type: collectionMatch.collection_name,
              },
              runtimeContext,
              mastra,
            });
            
            logger?.info(`✅ [Automation] Published: ${folder.folder_name}`);
            return { success: true, status: 'published', confidence: validation.overall_confidence };
          } else {
            logger?.info(`⏸️ [Automation] Needs review: ${folder.folder_name} (${validation.overall_confidence}%)`);
            return { success: true, status: validation.status, confidence: validation.overall_confidence };
          }
          
        } catch (error: any) {
          logger?.error(`❌ [Automation] Failed: ${folder.folder_name}`, { error: error.message });
          return { success: false, status: 'failed', confidence: 0 };
        }
      })
    );
    
    return {
      folders_found,
      processed_results: results,
    };
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
  .then(processAllFoldersStep)
  .then(aggregateResultsStep)
  .commit();
