import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import "@shopify/shopify-api/adapters/node";
import dotenv from "dotenv";

dotenv.config();

async function testConnections() {
  console.log('🔌 Testing API Connections...\n');
  
  const results = {
    shopify: false,
    google_vision: false,
    perplexity: false,
    openai: false,
  };
  
  // Test Shopify
  console.log('1️⃣ Testing Shopify...');
  try {
    if (!process.env.SHOPIFY_STORE_URL || !process.env.SHOPIFY_ACCESS_TOKEN) {
      console.log('   ❌ Missing SHOPIFY_STORE_URL or SHOPIFY_ACCESS_TOKEN');
    } else {
      const shopify = shopifyApi({
        apiSecretKey: process.env.SHOPIFY_ACCESS_TOKEN,
        apiVersion: ApiVersion.October24,
        isCustomStoreApp: true,
        adminApiAccessToken: process.env.SHOPIFY_ACCESS_TOKEN,
        isEmbeddedApp: false,
        hostName: process.env.SHOPIFY_STORE_URL.replace(/^https?:\/\//, ''),
      });
      
      const session = shopify.session.customAppSession(process.env.SHOPIFY_STORE_URL);
      const client = new shopify.clients.Rest({ session });
      
      const response = await client.get({ path: 'shop' });
      const shop = (response.body as any).shop;
      
      console.log(`   ✅ Connected to: ${shop.name}`);
      console.log(`   📧 Email: ${shop.email}`);
      console.log(`   🌍 Domain: ${shop.domain}`);
      results.shopify = true;
    }
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
  }
  
  // Test Google Cloud Vision
  console.log('\n2️⃣ Testing Google Cloud Vision...');
  if (!process.env.GOOGLE_CLOUD_VISION_API_KEY) {
    console.log('   ❌ Missing GOOGLE_CLOUD_VISION_API_KEY');
  } else {
    console.log('   ✅ API Key configured');
    results.google_vision = true;
  }
  
  // Test Perplexity
  console.log('\n3️⃣ Testing Perplexity...');
  if (!process.env.PERPLEXITY_API_KEY) {
    console.log('   ❌ Missing PERPLEXITY_API_KEY');
  } else {
    console.log('   ✅ API Key configured');
    results.perplexity = true;
  }
  
  // Test OpenAI (Replit AI Integrations)
  console.log('\n4️⃣ Testing OpenAI (Replit AI Integrations)...');
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY || !process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
    console.log('   ❌ Missing AI_INTEGRATIONS_OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_BASE_URL');
  } else {
    console.log('   ✅ Base URL:', process.env.AI_INTEGRATIONS_OPENAI_BASE_URL);
    console.log('   ✅ API Key configured');
    results.openai = true;
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY:');
  console.log('='.repeat(50));
  console.log(`Shopify:        ${results.shopify ? '✅ Connected' : '❌ Failed'}`);
  console.log(`Google Vision:  ${results.google_vision ? '✅ Configured' : '❌ Missing'}`);
  console.log(`Perplexity:     ${results.perplexity ? '✅ Configured' : '❌ Missing'}`);
  console.log(`OpenAI:         ${results.openai ? '✅ Configured' : '❌ Missing'}`);
  console.log('='.repeat(50));
  
  const allGood = Object.values(results).every(v => v === true);
  if (allGood) {
    console.log('\n🎉 All API connections are ready!');
  } else {
    console.log('\n⚠️  Some API connections need attention.');
  }
}

testConnections().catch(console.error);
