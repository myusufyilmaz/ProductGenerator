import dotenv from 'dotenv';
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import "@shopify/shopify-api/adapters/node";

dotenv.config();

async function testWorkingFeatures() {
  console.log('🎯 InkMerge - Working Features Test\n');
  console.log('='.repeat(70));

  console.log('\n✅ SHOPIFY INTEGRATION');
  console.log('-'.repeat(70));

  try {
    const shopify = shopifyApi({
      apiSecretKey: process.env.SHOPIFY_ACCESS_TOKEN!,
      apiVersion: ApiVersion.October24,
      isCustomStoreApp: true,
      adminApiAccessToken: process.env.SHOPIFY_ACCESS_TOKEN!,
      isEmbeddedApp: false,
      hostName: process.env.SHOPIFY_STORE_URL!.replace(/^https?:\/\//, ''),
    });

    const session = shopify.session.customAppSession(process.env.SHOPIFY_STORE_URL!);
    const client = new shopify.clients.Rest({ session });

    // Get shop info
    const shopResponse = await client.get({ path: 'shop' });
    const shop = (shopResponse.body as any).shop;

    console.log('Store Name:', shop.name);
    console.log('Email:', shop.email);
    console.log('Domain:', shop.domain);
    console.log('Currency:', shop.currency);

    // Get products count
    const productsResponse = await client.get({ path: 'products/count' });
    const productCount = (productsResponse.body as any).count;
    console.log('Total Products:', productCount);

    // Get collections count
    const collectionsResponse = await client.get({ path: 'custom_collections/count' });
    const collectionCount = (collectionsResponse.body as any).count;
    console.log('Custom Collections:', collectionCount);

    console.log('\n✅ Shopify API is fully functional!');

  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📊 CONFIGURED SERVICES');
  console.log('-'.repeat(70));

  const services = {
    'Shopify': process.env.SHOPIFY_ACCESS_TOKEN && !process.env.SHOPIFY_ACCESS_TOKEN.startsWith('your_'),
    'Supabase Database': process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY,
    'Google Cloud Vision': process.env.GOOGLE_CLOUD_VISION_API_KEY && !process.env.GOOGLE_CLOUD_VISION_API_KEY.startsWith('your_'),
    'Perplexity AI': process.env.PERPLEXITY_API_KEY && !process.env.PERPLEXITY_API_KEY.startsWith('your_'),
    'OpenAI (Replit)': process.env.AI_INTEGRATIONS_OPENAI_API_KEY && !process.env.AI_INTEGRATIONS_OPENAI_API_KEY.startsWith('your_'),
  };

  for (const [service, configured] of Object.entries(services)) {
    console.log(`${configured ? '✅' : '❌'} ${service}`);
  }

  console.log('\n' + '='.repeat(70));

  const configuredCount = Object.values(services).filter(v => v).length;
  const totalCount = Object.values(services).length;

  console.log(`\n📈 Configuration Status: ${configuredCount}/${totalCount} services ready`);

  if (configuredCount === totalCount) {
    console.log('🎉 All services are configured and ready to use!\n');
  } else {
    console.log('\n⚠️  To complete setup, you still need to configure:');
    for (const [service, configured] of Object.entries(services)) {
      if (!configured) {
        console.log(`   - ${service}`);
      }
    }
    console.log('');
  }
}

testWorkingFeatures().catch(console.error);
