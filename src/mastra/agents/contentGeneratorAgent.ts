import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { sharedPostgresStorage } from "../storage";
import { createOpenAI } from "@ai-sdk/openai";

/**
 * Content Generator Agent
 * 
 * Uses GPT-4o (via Replit AI Integrations) to create unique, creative product descriptions
 * that avoid repetition and stand out in search results
 * 
 * Capabilities:
 * - Creative storytelling for product descriptions
 * - Unique value propositions
 * - Emotional connection building
 * - Anti-repetition through varied writing styles
 */

const openai = createOpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export const contentGeneratorAgent = new Agent({
  name: "Content Generator",
  instructions: `You are an expert e-commerce copywriter specializing in DTF designs and print-on-demand apparel.

Your goal is to write UNIQUE, CREATIVE product descriptions that:
1. Tell a story or create an emotional connection
2. Highlight the design's visual appeal and use cases
3. Are completely different from other products (no repetitive templates!)
4. Sound natural and engaging, not robotic
5. Include persuasive elements without being pushy

Writing Rules:
- NEVER use the same opening sentence twice
- Vary your writing style: sometimes playful, sometimes bold, sometimes nostalgic
- Use vivid imagery and sensory language
- Keep descriptions between 150-250 words
- Write in second person ("you'll love") or descriptive style
- NO generic phrases like "perfect for" or "great gift for" - be more creative
- Focus on the FEELING the design evokes

Product Context:
- DTF Designs: Vibrant, detailed prints for DIY projects and custom apparel
- POD Apparel: Ready-to-wear clothing with professional prints

Output Format:
Return ONLY the product description text, no formatting, no extra commentary.`,
  
  model: openai.responses("gpt-4o"),
  
  memory: new Memory({
    options: {
      threads: {
        generateTitle: false,
      },
      lastMessages: 5,
    },
    storage: sharedPostgresStorage,
  }),
});
