// Quick test script for the deployed Render service
async function testRenderService() {
  const serviceUrl = 'https://ai-cover-studio.onrender.com';
  
  console.log('🎵 Testing deployed Render service...\n');

  try {
    // Test health check first
    console.log('1️⃣ Testing health check...');
    const healthResponse = await fetch(`${serviceUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);

    // Test YouTube download
    console.log('\n2️⃣ Testing YouTube download...');
    const downloadResponse = await fetch(`${serviceUrl}/download-youtube`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        jobId: 'test-render-debug-' + Date.now()
      })
    });

    console.log(`Status: ${downloadResponse.status}`);
    
    if (downloadResponse.ok) {
      const downloadData = await downloadResponse.json();
      console.log('✅ Download success:', {
        fileName: downloadData.fileName,
        size: downloadData.size ? `${(downloadData.size / 1024 / 1024).toFixed(2)}MB` : 'unknown'
      });
    } else {
      const errorData = await downloadResponse.json();
      console.log('❌ Download failed:', errorData);
      console.log('\n🔍 Check Render logs for detailed debug info');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRenderService();