#!/usr/bin/env node

/**
 * Helper script to extract YouTube cookies from browser
 * 
 * Usage:
 * 1. Install browser cookie extractor: npm install -g chrome-cookies-secure
 * 2. Log into YouTube in your browser
 * 3. Run: node extract-cookies.js
 * 4. Copy the generated cookies.txt to your server
 * 5. Set YOUTUBE_COOKIES_FILE=/path/to/cookies.txt in your environment
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('YouTube Cookie Extractor');
console.log('========================\n');

console.log('This script helps you extract YouTube cookies from your browser.');
console.log('Make sure you are logged into YouTube in your browser before proceeding.\n');

// Instructions for different methods
console.log('Method 1: Using browser extensions');
console.log('----------------------------------');
console.log('1. Install a cookie export extension like "Get cookies.txt" or "EditThisCookie"');
console.log('2. Visit youtube.com and ensure you\'re logged in');
console.log('3. Export cookies in Netscape/Mozilla format');
console.log('4. Save as cookies.txt in this directory\n');

console.log('Method 2: Manual extraction from browser DevTools');
console.log('------------------------------------------------');
console.log('1. Open YouTube in your browser and log in');
console.log('2. Open DevTools (F12) and go to Application/Storage tab');
console.log('3. Find Cookies section and select youtube.com');
console.log('4. Look for these important cookies:');
console.log('   - VISITOR_INFO1_LIVE');
console.log('   - PREF');
console.log('   - LOGIN_INFO');
console.log('   - SID, HSID, SSID, APISID, SAPISID');
console.log('5. Create cookies.txt in Netscape format:\n');

console.log('Example cookies.txt format:');
console.log('# Netscape HTTP Cookie File');
console.log('.youtube.com\tTRUE\t/\tTRUE\t1234567890\tVISITOR_INFO1_LIVE\tyour_value_here');
console.log('.youtube.com\tTRUE\t/\tFALSE\t1234567890\tPREF\tyour_value_here\n');

console.log('Method 3: Using yt-dlp to extract cookies');
console.log('-----------------------------------------');
console.log('yt-dlp can extract cookies directly from your browser:');
console.log('');
console.log('For Chrome:');
console.log('  yt-dlp --cookies-from-browser chrome --write-info-json --skip-download https://www.youtube.com');
console.log('');
console.log('For Firefox:');
console.log('  yt-dlp --cookies-from-browser firefox --write-info-json --skip-download https://www.youtube.com');
console.log('');
console.log('Then use: yt-dlp --cookies cookies.txt <youtube_url>\n');

// Create a template cookies file
const templateContent = `# Netscape HTTP Cookie File
# This file contains cookies for youtube.com
# Replace the placeholder values with actual cookie values from your browser

# Example format:
# domain\tflag\tpath\tsecure\texpiration\tname\tvalue

.youtube.com\tTRUE\t/\tTRUE\t0\tVISITOR_INFO1_LIVE\tYOUR_VALUE_HERE
.youtube.com\tTRUE\t/\tFALSE\t0\tPREF\tYOUR_VALUE_HERE
.youtube.com\tTRUE\t/\tTRUE\t0\tLOGIN_INFO\tYOUR_VALUE_HERE
.youtube.com\tTRUE\t/\tFALSE\t0\tSID\tYOUR_VALUE_HERE
.youtube.com\tTRUE\t/\tTRUE\t0\tHSID\tYOUR_VALUE_HERE
.youtube.com\tTRUE\t/\tTRUE\t0\tSSID\tYOUR_VALUE_HERE
.youtube.com\tTRUE\t/\tTRUE\t0\tAPISID\tYOUR_VALUE_HERE
.youtube.com\tTRUE\t/\tTRUE\t0\tSAPISID\tYOUR_VALUE_HERE
`;

const templatePath = path.join(process.cwd(), 'cookies-template.txt');
fs.writeFileSync(templatePath, templateContent);

console.log(`Created template file: ${templatePath}`);
console.log('Edit this file and replace YOUR_VALUE_HERE with actual cookie values.\n');

console.log('Testing cookie extraction with yt-dlp...');
try {
  // Try to extract cookies using yt-dlp
  console.log('Attempting to extract cookies from Chrome...');
  execSync('yt-dlp --cookies-from-browser chrome --cookies cookies-chrome.txt --skip-download https://www.youtube.com', { stdio: 'inherit' });
  console.log('✅ Cookies extracted to cookies-chrome.txt');
} catch (error) {
  console.log('❌ Could not extract from Chrome. Try Firefox or manual method.');
  
  try {
    console.log('\nAttempting to extract cookies from Firefox...');
    execSync('yt-dlp --cookies-from-browser firefox --cookies cookies-firefox.txt --skip-download https://www.youtube.com', { stdio: 'inherit' });
    console.log('✅ Cookies extracted to cookies-firefox.txt');
  } catch (error2) {
    console.log('❌ Could not extract from Firefox either. Use manual method.');
  }
}

console.log('\n📝 Next steps:');
console.log('1. Check if cookies*.txt files were created');
console.log('2. Copy the cookies file to your server');
console.log('3. Set environment variable: YOUTUBE_COOKIES_FILE=/path/to/cookies.txt');
console.log('4. Restart your processing service');