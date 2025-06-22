/**
 * Replicate Integration Diagnostic Script
 * Run with: node debug-replicate.js
 */

console.log('=== Replicate Integration Diagnostic ===\n');

// 1. Check environment variables
console.log('1. Environment Variables:');
console.log(`   REPLICATE_API_TOKEN: ${process.env.REPLICATE_API_TOKEN ? '✓ Set (' + process.env.REPLICATE_API_TOKEN.substring(0,8) + '...)' : '✗ Missing'}`);
console.log(`   NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL || '✗ Not set'}`);
console.log(`   VERCEL_URL: ${process.env.VERCEL_URL || '✗ Not set'}`);
console.log(`   WEBHOOK_SECRET: ${process.env.WEBHOOK_SECRET ? '✓ Set' : '✗ Not set'}`);

// 2. Check webhook URL generation logic
console.log('\n2. Webhook URL Generation:');
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';
const webhookUrl = `${baseUrl}/api/webhooks/replicate`;
console.log(`   Base URL: ${baseUrl}`);
console.log(`   Webhook URL: ${webhookUrl}`);

// 3. Test Replicate API connection
console.log('\n3. Replicate API Test:');
if (!process.env.REPLICATE_API_TOKEN) {
  console.log('   ✗ Cannot test - REPLICATE_API_TOKEN not set');
  console.log('   💡 Set REPLICATE_API_TOKEN in your environment variables');
} else {
  // Dynamic import to test Replicate
  (async () => {
    try {
      const Replicate = (await import('replicate')).default;
      const replicateClient = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
      
      console.log('   Testing API connection...');
      const account = await replicateClient.accounts.current();
      console.log(`   ✓ Connected as: ${account.username}`);
      
      // Test creating a simple prediction to see what happens
      console.log('\n4. Test Prediction Creation:');
      console.log('   Creating test prediction...');
      
      const prediction = await replicateClient.predictions.create({
        model: 'black-forest-labs/flux-schnell',
        input: {
          prompt: 'test image',
          aspect_ratio: '1:1',
          num_outputs: 1,
          output_format: 'jpg',
          output_quality: 80
        },
        webhook: webhookUrl,
        webhook_events_filter: ['completed'],
      });
      
      console.log(`   ✓ Prediction created successfully!`);
      console.log(`   Prediction ID: ${prediction.id}`);
      console.log(`   Status: ${prediction.status}`);
      console.log(`   Webhook URL used: ${webhookUrl}`);
      
      // Cancel the test prediction to avoid charges
      setTimeout(async () => {
        try {
          await replicateClient.predictions.cancel(prediction.id);
          console.log(`   ✓ Test prediction cancelled`);
        } catch (e) {
          console.log(`   ⚠️  Could not cancel test prediction: ${e.message}`);
        }
      }, 1000);
      
    } catch (error) {
      console.log(`   ✗ API test failed: ${error.message}`);
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.log('   💡 Check your REPLICATE_API_TOKEN - it may be invalid');
      } else if (error.message.includes('webhook')) {
        console.log('   💡 Webhook URL issue - check if your deployment is accessible');
      }
      console.log(`   Full error: ${error.stack}`);
    }
  })();
}

console.log('\n5. Webhook Accessibility:');
if (webhookUrl.includes('localhost')) {
  console.log('   ⚠️  Webhook URL is localhost - Replicate cannot reach it');
  console.log('   💡 Deploy to Vercel or use ngrok for local testing');
} else {
  console.log('   ✓ Webhook URL appears to be publicly accessible');
}

console.log('\n=== Common Issues & Solutions ===');
console.log('1. Missing REPLICATE_API_TOKEN → Get from https://replicate.com/account/api-tokens');
console.log('2. Localhost webhook → Deploy to Vercel or use ngrok');
console.log('3. No NEXT_PUBLIC_APP_URL set → Add your deployed URL to env vars');
console.log('4. Predictions not showing in dashboard → Check API token validity');
console.log('5. Webhook not firing → Ensure webhook URL is accessible from internet');