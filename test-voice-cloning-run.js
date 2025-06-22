#!/usr/bin/env node

/**
 * Test script using replicate.run() method (playground method)
 * This should work since it matches the playground exactly
 */

const Replicate = require('replicate');

async function testVoiceCloning() {
  console.log('🎤 Testing Voice Cloning with replicate.run()');
  console.log('===============================================');
  
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
    console.log('🚀 Running voice cloning with replicate.run()...');
    const startTime = Date.now();

    // Use EXACTLY the same code that worked in playground
    const output = await replicate.run(
      "zsxkib/realistic-voice-cloning:0a9c7c558af4c0f20667c1bd1260ce32a2879944a0b9e44e1398660c077b1550",
      {
        input: {
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
        }
      }
    );

    const totalTime = Date.now() - startTime;
    console.log(`✅ SUCCESS! Completed in ${totalTime}ms`);
    
    console.log('📋 Output details:');
    console.log(`  Type: ${typeof output}`);
    console.log(`  Output: ${output}`);
    
    // Try to access URL (if output has url method)
    if (output && typeof output.url === 'function') {
      console.log(`  URL: ${output.url()}`);
    } else if (typeof output === 'string') {
      console.log(`  Direct URL: ${output}`);
    }

  } catch (error) {
    console.error('❌ ERROR with replicate.run():');
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
testVoiceCloning().catch(console.error);