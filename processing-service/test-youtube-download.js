#!/usr/bin/env node

/**
 * Test script for the improved YouTube download functionality
 * 
 * Usage:
 * node test-youtube-download.js [youtube-url]
 * 
 * Examples:
 * node test-youtube-download.js https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * node test-youtube-download.js https://youtu.be/dQw4w9WgXcQ
 */

import fs from 'fs';
import path from 'path';

const PROCESSING_SERVICE_URL = process.env.PROCESSING_SERVICE_URL || 'http://localhost:3001';

// Test YouTube URLs (popular, non-copyrighted videos)
const TEST_URLS = [
  'https://www.youtube.com/watch?v=aqz-KE-bpKQ', // Big Buck Bunny
  'https://www.youtube.com/watch?v=gLESpHrtvxs', // Sintel
  'https://www.youtube.com/watch?v=YE7VzlLtp-4', // Tears of Steel
];

async function testHealthCheck() {
  console.log('🏥 Testing health check...');
  try {
    const response = await fetch(`${PROCESSING_SERVICE_URL}/health`);
    const data = await response.json();
    console.log('✅ Health check response:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    throw error;
  }
}

async function testYouTubeDownload(url) {
  const jobId = `test_${Date.now()}`;
  console.log(`\n📥 Testing YouTube download...`);
  console.log(`URL: ${url}`);
  console.log(`Job ID: ${jobId}`);
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${PROCESSING_SERVICE_URL}/download-youtube`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        jobId
      }),
    });

    const responseTime = Date.now() - startTime;
    console.log(`⏱️  Response time: ${responseTime}ms`);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`❌ Download failed (${response.status}):`, errorData);
      
      if (response.status === 429) {
        console.log('\n🤖 Bot detection triggered!');
        console.log('Suggestions:');
        console.log('1. Extract cookies from your browser using: node extract-cookies.js');
        console.log('2. Set YOUTUBE_COOKIES_FILE environment variable');
        console.log('3. Try again with a longer delay between requests');
      }
      
      return { success: false, error: errorData };
    }

    const data = await response.json();
    
    if (data.success && data.fileData) {
      const fileSize = Buffer.from(data.fileData, 'base64').length;
      console.log(`✅ Download successful!`);
      console.log(`   File name: ${data.fileName}`);
      console.log(`   File size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Base64 size: ${(data.fileData.length / 1024 / 1024).toFixed(2)}MB`);
      
      // Optionally save the file locally for verification
      const outputPath = path.join(process.cwd(), data.fileName);
      fs.writeFileSync(outputPath, Buffer.from(data.fileData, 'base64'));
      console.log(`   Saved to: ${outputPath}`);
      
      return { success: true, path: outputPath, size: fileSize };
    } else {
      console.error('❌ Invalid response format:', data);
      return { success: false, error: 'Invalid response format' };
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testCookieUpdate(cookiesPath) {
  console.log('\n🍪 Testing cookie update...');
  try {
    const cookiesContent = fs.readFileSync(cookiesPath, 'utf8');
    
    const response = await fetch(`${PROCESSING_SERVICE_URL}/update-cookies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cookiesContent
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Cookies updated successfully:', data.message);
      return true;
    } else {
      console.error('❌ Cookie update failed:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Cookie update error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 YouTube Download Test Suite');
  console.log('==============================\n');
  
  // Check if processing service is running
  try {
    const health = await testHealthCheck();
    console.log(`\n📊 Service features:`);
    Object.entries(health.features || {}).forEach(([feature, enabled]) => {
      console.log(`   ${enabled ? '✅' : '❌'} ${feature}`);
    });
  } catch (error) {
    console.error('\n❌ Processing service is not running!');
    console.error('Start it with: cd processing-service && npm start');
    process.exit(1);
  }
  
  // Check for cookies file
  const cookiesFile = process.env.YOUTUBE_COOKIES_FILE || 'cookies.txt';
  if (fs.existsSync(cookiesFile)) {
    console.log(`\n🍪 Found cookies file: ${cookiesFile}`);
    await testCookieUpdate(cookiesFile);
  } else {
    console.log(`\n⚠️  No cookies file found at: ${cookiesFile}`);
    console.log('YouTube might detect bot activity without cookies.');
    console.log('Run: node extract-cookies.js to create one.');
  }
  
  // Test with provided URL or use test URLs
  const urlToTest = process.argv[2] || TEST_URLS[0];
  
  console.log('\n🚀 Starting download test...');
  const result = await testYouTubeDownload(urlToTest);
  
  if (result.success) {
    console.log('\n🎉 Test completed successfully!');
    
    // Clean up test file
    if (result.path && fs.existsSync(result.path)) {
      fs.unlinkSync(result.path);
      console.log('🧹 Cleaned up test file');
    }
  } else {
    console.log('\n😞 Test failed.');
    
    if (result.error?.includes('bot') || result.error?.includes('429')) {
      console.log('\n💡 Try these solutions:');
      console.log('1. Use cookies from a logged-in browser session');
      console.log('2. Add delays between requests');
      console.log('3. Use a VPN or proxy');
      console.log('4. Try during off-peak hours');
    }
  }
  
  console.log('\n📝 Additional test URLs you can try:');
  TEST_URLS.forEach(url => console.log(`   node test-youtube-download.js ${url}`));
}

// Run tests
runTests().catch(console.error);