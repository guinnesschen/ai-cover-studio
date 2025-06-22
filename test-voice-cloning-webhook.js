#!/usr/bin/env node

/**
 * Test script using replicate.predictions.create() with 'version' parameter
 * Testing the webhook approach from their example
 */

const Replicate = require('replicate');

async function testVoiceCloningWebhook() {
  console.log('🎤 Testing Voice Cloning with Webhook (version parameter)');
  console.log('=====================================================');
  
  // Check environment
  if (!process.env.REPLICATE_API_TOKEN) {
    console.error('❌ REPLICATE_API_TOKEN not found in environment');
    console.log('Please set it with: export REPLICATE_API_TOKEN=your_token_here');
    process.exit(1);
  }

  // Initialize Replicate client
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  console.log('✅ Replicate client initialized');

  try {
    console.log('🚀 Testing webhook approach with version parameter...');
    const startTime = Date.now();

    // Use their example format but with our audio URL and full parameters
    const input = {
      protect: 0.33,
      rvc_model: "Squidward",
      index_rate: 0.5,
      song_input: "https://eyabmo3jngfrsfq1.public.blob.vercel-storage.com/cmc7fxpfi0000js0aw5t5b34q/audio.webm",
      reverb_size: 0.15,
      pitch_change: "no-change",
      rms_mix_rate: 0.25,
      filter_radius: 3,
      output_format: "mp3",
      reverb_damping: 0.7,
      reverb_dryness: 0.8,
      reverb_wetness: 0.2,
      crepe_hop_length: 128,
      pitch_change_all: 0,
      main_vocals_volume_change: 0,
      pitch_detection_algorithm: "rmvpe",
      instrumental_volume_change: 0,
      backup_vocals_volume_change: 0
    };

    const callbackURL = `https://example.com/webhook`; // Dummy webhook for testing
    
    // Use their exact format with 'version' instead of 'model'
    const prediction = await replicate.predictions.create({
      version: "0a9c7c558af4c0f20667c1bd1260ce32a2879944a0b9e44e1398660c077b1550",
      input: input,
      webhook: callbackURL,
      webhook_events_filter: ["completed"],
    });

    const createTime = Date.now() - startTime;
    console.log(`✅ Prediction created successfully with webhook in ${createTime}ms`);
    
    console.log('📋 Prediction details:');
    console.log(`  ID: ${prediction.id}`);
    console.log(`  Status: ${prediction.status}`);
    console.log(`  Created: ${prediction.created_at}`);
    console.log(`  Webhook: ${callbackURL}`);
    
    if (prediction.urls && prediction.urls.get) {
      console.log(`  Get URL: ${prediction.urls.get}`);
    }

    console.log('\n🎉 SUCCESS! Webhook approach with version parameter works!');
    console.log('This means we can update the actual pipeline code to use:');
    console.log('  - version: "hash" instead of model: "name:hash"');
    console.log('  - The same parameter structure that worked in playground');

  } catch (error) {
    console.error('❌ ERROR with webhook approach:');
    console.error(`  Message: ${error.message}`);
    
    if (error.status) {
      console.error(`  Status: ${error.status}`);
    }
    
    if (error.response) {
      console.error(`  Response: ${JSON.stringify(error.response, null, 2)}`);
    }
    
    process.exit(1);
  }
}

// Run the test
testVoiceCloningWebhook().catch(console.error);