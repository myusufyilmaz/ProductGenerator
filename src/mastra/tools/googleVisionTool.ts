import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import vision from "@google-cloud/vision";

/**
 * Google Cloud Vision Tool
 * 
 * Analyzes product images to extract factual information:
 * - Detected objects and labels
 * - Dominant colors
 * - Text content (OCR)
 * - Logo detection
 * 
 * This provides FACTS for AI to work with, preventing hallucination
 */

// Initialize Vision API client
function getVisionClient() {
  return new vision.ImageAnnotatorClient({
    apiKey: process.env.GOOGLE_CLOUD_VISION_API_KEY,
  });
}

export const analyzeProductImagesTool = createTool({
  id: "analyze-product-images",
  description: "Analyzes product mockup images using Google Cloud Vision to extract colors, objects, text, and design elements",
  
  inputSchema: z.object({
    images: z.array(z.object({
      name: z.string(),
      content: z.string().describe("Base64 encoded image"),
    })).describe("Array of product images to analyze"),
    sku: z.string().describe("Product SKU for tracking"),
  }),
  
  outputSchema: z.object({
    labels: z.array(z.string()).describe("Detected objects and concepts"),
    dominant_colors: z.array(z.object({
      color: z.string(),
      hex: z.string(),
      score: z.number(),
    })).describe("Dominant colors in the design"),
    detected_text: z.array(z.string()).describe("Text found in images"),
    logos: z.array(z.string()).describe("Detected logos or brands"),
    properties: z.object({
      has_text: z.boolean(),
      color_count: z.number(),
      primary_subjects: z.array(z.string()),
    }),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('👁️ [GoogleVision] Analyzing product images', { 
      sku: context.sku, 
      image_count: context.images.length 
    });
    
    try {
      const client = getVisionClient();
      
      const allLabels = new Set<string>();
      const allColors: Array<{ color: string; hex: string; score: number }> = [];
      const allText = new Set<string>();
      const allLogos = new Set<string>();
      
      for (const image of context.images) {
        logger?.info('🔍 [GoogleVision] Processing image', { name: image.name });
        
        const imageBuffer = Buffer.from(image.content, 'base64');
        
        // Perform multiple detection types in one API call
        const [result] = await client.annotateImage({
          image: { content: imageBuffer },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 20 },
            { type: 'IMAGE_PROPERTIES' },
            { type: 'TEXT_DETECTION' },
            { type: 'LOGO_DETECTION' },
          ],
        });

        // Extract labels (objects, concepts)
        if (result.labelAnnotations) {
          result.labelAnnotations.forEach(label => {
            if (label.description && label.score! > 0.6) {
              allLabels.add(label.description.toLowerCase());
            }
          });
        }

        // Extract dominant colors
        if (result.imagePropertiesAnnotation?.dominantColors?.colors) {
          result.imagePropertiesAnnotation.dominantColors.colors
            .slice(0, 5)  // Top 5 colors
            .forEach(colorInfo => {
              const color = colorInfo.color!;
              const rgb = `rgb(${color.red || 0}, ${color.green || 0}, ${color.blue || 0})`;
              const hex = `#${((color.red || 0) << 16 | (color.green || 0) << 8 | (color.blue || 0)).toString(16).padStart(6, '0')}`;
              
              allColors.push({
                color: rgb,
                hex: hex,
                score: colorInfo.score || 0,
              });
            });
        }

        // Extract text
        if (result.textAnnotations && result.textAnnotations.length > 0) {
          // First annotation contains all text
          const fullText = result.textAnnotations[0].description || '';
          fullText.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed.length > 0) {
              allText.add(trimmed);
            }
          });
        }

        // Extract logos
        if (result.logoAnnotations) {
          result.logoAnnotations.forEach(logo => {
            if (logo.description) {
              allLogos.add(logo.description);
            }
          });
        }
      }

      // Deduplicate and sort colors by score
      const uniqueColors = Array.from(
        new Map(allColors.map(c => [c.hex, c])).values()
      ).sort((a, b) => b.score - a.score).slice(0, 5);

      const labels = Array.from(allLabels);
      const detected_text = Array.from(allText);
      const logos = Array.from(allLogos);

      // Extract primary subjects (top labels)
      const primary_subjects = labels.slice(0, 5);

      logger?.info('✅ [GoogleVision] Analysis complete', {
        sku: context.sku,
        labels_count: labels.length,
        colors_count: uniqueColors.length,
        text_items: detected_text.length,
        logos_count: logos.length,
      });

      return {
        labels,
        dominant_colors: uniqueColors,
        detected_text,
        logos,
        properties: {
          has_text: detected_text.length > 0,
          color_count: uniqueColors.length,
          primary_subjects,
        },
      };
      
    } catch (error) {
      logger?.error('❌ [GoogleVision] Error analyzing images', { error });
      throw error;
    }
  },
});
