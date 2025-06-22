#!/usr/bin/env node

/**
 * Test script to directly call the Replicate voice cloning model
 * This replicates the actual pipeline code but as a standalone script
 */

const Replicate = require('replicate');

async function testVoiceCloning() {
  console.log('🎤 Testing Voice Cloning Model Direct Call');
  console.log('=====================================');
  
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
  console.log(`🔑 Token: ${process.env.REPLICATE_API_TOKEN.substring(0, 8)}...`);

  // Test audio URL from the error
  const audioUrl = 'https://eyabmo3jngfrsfq1.public.blob.vercel-storage.com/cmc7fxpfi0000js0aw5t5b34q/audio.webm';
  
  console.log('🎵 Test audio URL:', audioUrl);

  // Model parameters exactly as in the pipeline
  const modelName = 'zsxkib/realistic-voice-cloning:0a9c7c558af4c0f20667c1bd1260ce32a2879944a0b9e44e1398660c077b1550';
  const input = {
    song_input: audioUrl,
    rvc_model: 'Squidward',
    pitch_change: 'no-change',
    index_rate: 0.5, // Playground working value
    filter_radius: 3,
    rms_mix_rate: 0.25, // Playground working value
    pitch_detection_algorithm: 'rmvpe',
    crepe_hop_length: 128, // Playground working value
    protect: 0.33, // Playground working value
    main_vocals_volume_change: 0, // Playground working value
    backup_vocals_volume_change: 0,
    instrumental_volume_change: 0,
    pitch_change_all: 0,
    reverb_size: 0.15, // Playground working value
    reverb_wetness: 0.2, // Playground working value
    reverb_dryness: 0.8,
    reverb_damping: 0.7,
    output_format: 'mp3',
  };

  console.log('🔧 Model configuration:');
  console.log(`  Model: ${modelName}`);
  console.log(`  RVC Model: ${input.rvc_model}`);
  console.log(`  Pitch Detection: ${input.pitch_detection_algorithm}`);
  console.log(`  Output Format: ${input.output_format}`);

  try {
    console.log('🚀 Creating prediction...');
    const startTime = Date.now();
    
    const prediction = await replicate.predictions.create({
      model: modelName,
      input: input,
      // No webhook for testing
    });

    const createTime = Date.now() - startTime;
    console.log(`✅ Prediction created successfully in ${createTime}ms`);
    console.log('📋 Prediction details:');
    console.log(`  ID: ${prediction.id}`);
    console.log(`  Status: ${prediction.status}`);
    console.log(`  Created: ${prediction.created_at}`);
    
    if (prediction.urls && prediction.urls.get) {
      console.log(`  Get URL: ${prediction.urls.get}`);
    }

    // Poll for completion (simple version)
    console.log('⏳ Waiting for completion...');
    let finalPrediction = prediction;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (finalPrediction.status === 'starting' || finalPrediction.status === 'processing') {
      if (attempts >= maxAttempts) {
        console.log('⏰ Timeout waiting for completion');
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;
      
      console.log(`  Attempt ${attempts}/${maxAttempts} - Status: ${finalPrediction.status}`);
      finalPrediction = await replicate.predictions.get(prediction.id);
    }

    console.log('🏁 Final result:');
    console.log(`  Final Status: ${finalPrediction.status}`);
    
    if (finalPrediction.status === 'succeeded') {
      console.log('🎉 SUCCESS!');
      console.log(`  Output: ${finalPrediction.output}`);
      if (finalPrediction.metrics) {
        console.log(`  Processing Time: ${finalPrediction.metrics.predict_time}s`);
      }
    } else if (finalPrediction.status === 'failed') {
      console.log('❌ FAILED!');
      console.log(`  Error: ${finalPrediction.error}`);
    } else {
      console.log(`⏸️  Status: ${finalPrediction.status}`);
    }

  } catch (error) {
    console.error('❌ ERROR calling Replicate model:');
    console.error(`  Message: ${error.message}`);
    console.error(`  Status: ${error.status}`);
    
    if (error.response) {
      console.error(`  Response: ${JSON.stringify(error.response, null, 2)}`);
    }
    
    if (error.stack) {
      console.error(`  Stack: ${error.stack}`);
    }

    // Check if it's a 404 (model not found)
    if (error.message.includes('404')) {
      console.log('\n🔍 DIAGNOSIS: Model not found (404 error)');
      console.log('This suggests the model name is incorrect or the model doesn\'t exist.');
      console.log('Let\'s try some alternatives...');
      
      // Try to list available models from this user
      try {
        console.log('\n🔍 Attempting to find similar models...');
        // Note: This is just for debugging - Replicate API doesn't have a public search
        console.log('Try searching on https://replicate.com for "realistic voice cloning" or "RVC"');
      } catch (listError) {
        console.log('Could not list models for troubleshooting');
      }
    }
  }
}

// Run the test
testVoiceCloning().catch(console.error);