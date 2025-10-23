import dotenv from 'dotenv';
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import "@shopify/shopify-api/adapters/node";
import pg from 'pg';

dotenv.config();

async function testSystem() {
  console.log('🔍 InkMerge System Test\n');
  console.log('='.repeat(60));

  let allPassed = true;

  // Test 1: Shopify Connection
  console.log('\n1️⃣ Testing Shopify Connection...');
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

    const response = await client.get({ path: 'shop' });
    const shop = (response.body as any).shop;

    console.log('   ✅ Connected to:', shop.name);
    console.log('   📧 Email:', shop.email);
  } catch (error: any) {
    console.log('   ❌ Failed:', error.message);
    allPassed = false;
  }

  // Test 2: Database Connection
  console.log('\n2️⃣ Testing Database Connection...');
  try {
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();
    const result = await client.query('SELECT current_database(), version()');
    console.log('   ✅ Connected to:', result.rows[0].current_database);

    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('   📊 Tables found:', tables.rows.map(r => r.table_name).join(', '));

    await client.end();
  } catch (error: any) {
    console.log('   ❌ Failed:', error.message);
    allPassed = false;
  }

  // Test 3: Environment Variables
  console.log('\n3️⃣ Checking Environment Variables...');
  const requiredVars = [
    'SHOPIFY_STORE_URL',
    'SHOPIFY_ACCESS_TOKEN',
    'DATABASE_URL',
    'GOOGLE_CLOUD_VISION_API_KEY',
    'PERPLEXITY_API_KEY',
    'AI_INTEGRATIONS_OPENAI_API_KEY',
  ];

  const configuredVars = requiredVars.filter(v => {
    const value = process.env[v];
    return value && !value.startsWith('your_') && value !== 'YOUR_DB_PASSWORD';
  });

  console.log(`   ✅ Configured: ${configuredVars.length}/${requiredVars.length} variables`);

  const missingVars = requiredVars.filter(v => {
    const value = process.env[v];
    return !value || value.startsWith('your_') || value === 'YOUR_DB_PASSWORD';
  });

  if (missingVars.length > 0) {
    console.log('   ⚠️  Missing:', missingVars.join(', '));
  }

  console.log('\n' + '='.repeat(60));

  if (allPassed) {
    console.log('✅ System is operational and ready to use!\n');
  } else {
    console.log('⚠️  System has some issues that need attention.\n');
  }
}

testSystem().catch(console.error);
