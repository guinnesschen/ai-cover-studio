// Test script for processing service
import fetch from 'node-fetch';

const SERVICE_URL = 'http://localhost:3001';

async function testHealthCheck() {
  console.log('🏥 Testing health check...');
  try {
    const response = await fetch(`${SERVICE_URL}/health`);
    const data = await response.json();
    console.log('✅ Health check:', data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testYouTubeDownload() {
  console.log('🎵 Testing YouTube download...');
  try {
    const response = await fetch(`${SERVICE_URL}/download-youtube`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        jobId: 'test-' + Date.now()
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${errorData.error}`);
    }

    const data = await response.json();
    console.log('✅ YouTube download success:', {
      fileName: data.fileName,
      size: `${(data.size / 1024 / 1024).toFixed(2)}MB`
    });
    return data;
  } catch (error) {
    console.error('❌ YouTube download failed:', error.message);
    return null;
  }
}

async function testVideoStitch(audioData) {
  console.log('🎬 Testing video stitch...');
  try {
    const response = await fetch(`${SERVICE_URL}/stitch-video-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        audioData: audioData.fileData,
        jobId: 'test-stitch-' + Date.now()
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${errorData.error}`);
    }

    const data = await response.json();
    console.log('✅ Video stitch success:', {
      fileName: data.fileName
    });
    return true;
  } catch (error) {
    console.error('❌ Video stitch failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting processing service tests...\n');

  // Test 1: Health check
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n❌ Health check failed - service not running?');
    console.log('💡 Run: cd processing-service && npm run dev');
    return;
  }

  // Test 2: YouTube download
  console.log('');
  const audioData = await testYouTubeDownload();
  if (!audioData) {
    console.log('\n❌ YouTube download failed - check logs above');
    return;
  }

  // Test 3: Video stitch (only if download worked)
  console.log('');
  const stitchOk = await testVideoStitch(audioData);
  
  console.log('\n🎉 All tests completed!');
  if (healthOk && audioData && stitchOk) {
    console.log('✅ Processing service is ready for deployment!');
  } else {
    console.log('❌ Some tests failed - fix issues before deploying');
  }
}

runTests();