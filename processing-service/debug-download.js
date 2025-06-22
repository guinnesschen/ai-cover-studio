#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import youtubedl from 'youtube-dl-exec';
import { spawn } from 'child_process';

const TEST_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const TEST_DIR = '/tmp';
const JOB_ID = 'debug_test_' + Date.now();

console.log('🔍 YouTube Download Debug Script');
console.log('================================');
console.log(`URL: ${TEST_URL}`);
console.log(`Directory: ${TEST_DIR}`);
console.log(`Job ID: ${JOB_ID}`);
console.log('');

async function checkEnvironment() {
  console.log('📋 Environment Check:');
  console.log('--------------------');
  
  // Check Node version
  console.log(`Node.js version: ${process.version}`);
  
  // Check current directory
  console.log(`Current dir: ${process.cwd()}`);
  
  // Check if we can write to temp dir
  try {
    const testFile = path.join(TEST_DIR, 'write_test.txt');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log(`✅ Can write to ${TEST_DIR}`);
  } catch (error) {
    console.log(`❌ Cannot write to ${TEST_DIR}: ${error.message}`);
    return false;
  }
  
  // Check disk space
  try {
    const stats = fs.statSync(TEST_DIR);
    console.log(`✅ ${TEST_DIR} exists and is accessible`);
  } catch (error) {
    console.log(`❌ ${TEST_DIR} not accessible: ${error.message}`);
    return false;
  }
  
  console.log('');
  return true;
}

async function checkYtDlp() {
  console.log('🔧 yt-dlp Check:');
  console.log('----------------');
  
  return new Promise((resolve) => {
    const child = spawn('yt-dlp', ['--version'], { stdio: 'pipe' });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ yt-dlp version: ${stdout.trim()}`);
        resolve(true);
      } else {
        console.log(`❌ yt-dlp not working. Exit code: ${code}`);
        console.log(`stderr: ${stderr}`);
        resolve(false);
      }
    });
    
    child.on('error', (error) => {
      console.log(`❌ yt-dlp not found: ${error.message}`);
      resolve(false);
    });
  });
}

async function testDirectYtDlp() {
  console.log('🎬 Direct yt-dlp Test:');
  console.log('----------------------');
  
  const outputFile = path.join(TEST_DIR, `${JOB_ID}_direct.webm`);
  
  return new Promise((resolve) => {
    console.log(`Attempting download to: ${outputFile}`);
    
    const args = [
      '-f', 'best[ext=mp4]/best',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      '--referer', 'https://www.youtube.com/',
      '-o', outputFile,
      TEST_URL
    ];
    
    console.log(`Command: yt-dlp ${args.join(' ')}`);
    
    const child = spawn('yt-dlp', args, { stdio: 'pipe' });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(`[yt-dlp stdout] ${output.trim()}`);
    });
    
    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.log(`[yt-dlp stderr] ${output.trim()}`);
    });
    
    child.on('close', (code) => {
      console.log(`yt-dlp process exited with code: ${code}`);
      
      // Check if file was created
      if (fs.existsSync(outputFile)) {
        const stats = fs.statSync(outputFile);
        console.log(`✅ File created: ${outputFile} (${stats.size} bytes)`);
        
        // Clean up
        try {
          fs.unlinkSync(outputFile);
          console.log('✅ Cleaned up test file');
        } catch (err) {
          console.log(`⚠️  Could not clean up: ${err.message}`);
        }
        resolve(true);
      } else {
        console.log(`❌ File not created at: ${outputFile}`);
        
        // Check for any files that might have been created
        try {
          const files = fs.readdirSync(TEST_DIR);
          const matchingFiles = files.filter(f => f.includes(JOB_ID) || f.includes('direct'));
          console.log(`Files in ${TEST_DIR} matching pattern:`, matchingFiles);
          
          if (matchingFiles.length > 0) {
            matchingFiles.forEach(file => {
              const fullPath = path.join(TEST_DIR, file);
              const stats = fs.statSync(fullPath);
              console.log(`  - ${file}: ${stats.size} bytes`);
            });
          }
        } catch (err) {
          console.log(`Could not list directory: ${err.message}`);
        }
        
        resolve(false);
      }
    });
    
    child.on('error', (error) => {
      console.log(`❌ Failed to spawn yt-dlp: ${error.message}`);
      resolve(false);
    });
  });
}

async function testNodeModule() {
  console.log('📦 Node Module Test (youtube-dl-exec):');
  console.log('--------------------------------------');
  
  const outputFile = path.join(TEST_DIR, `${JOB_ID}_node.webm`);
  
  try {
    console.log(`Attempting download to: ${outputFile}`);
    
    const options = {
      output: outputFile,
      format: 'best[ext=mp4]/best',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      referer: 'https://www.youtube.com/'
    };
    
    console.log('Options:', JSON.stringify(options, null, 2));
    
    const result = await youtubedl(TEST_URL, options);
    console.log('youtubedl result:', typeof result === 'string' ? result.substring(0, 200) + '...' : result);
    
    // Check if file exists
    if (fs.existsSync(outputFile)) {
      const stats = fs.statSync(outputFile);
      console.log(`✅ File created: ${outputFile} (${stats.size} bytes)`);
      
      // Clean up
      try {
        fs.unlinkSync(outputFile);
        console.log('✅ Cleaned up test file');
      } catch (err) {
        console.log(`⚠️  Could not clean up: ${err.message}`);
      }
      return true;
    } else {
      console.log(`❌ File not created at: ${outputFile}`);
      
      // Check for any files that might have been created
      try {
        const files = fs.readdirSync(TEST_DIR);
        const matchingFiles = files.filter(f => f.includes(JOB_ID) || f.includes('node'));
        console.log(`Files in ${TEST_DIR} matching pattern:`, matchingFiles);
        
        if (matchingFiles.length > 0) {
          matchingFiles.forEach(file => {
            const fullPath = path.join(TEST_DIR, file);
            const stats = fs.statSync(fullPath);
            console.log(`  - ${file}: ${stats.size} bytes`);
          });
        }
      } catch (err) {
        console.log(`Could not list directory: ${err.message}`);
      }
      
      return false;
    }
    
  } catch (error) {
    console.log(`❌ youtube-dl-exec failed: ${error.message}`);
    console.log(`Stack trace:`, error.stack);
    return false;
  }
}

async function testWithDifferentExtensions() {
  console.log('🔄 Testing Different Extensions:');
  console.log('--------------------------------');
  
  const extensions = ['webm', 'mp4', 'm4a'];
  
  for (const ext of extensions) {
    console.log(`\nTesting with .${ext} extension:`);
    
    const outputFile = path.join(TEST_DIR, `${JOB_ID}_test.${ext}`);
    
    try {
      const options = {
        output: outputFile,
        format: ext === 'webm' ? 'bestaudio[ext=webm]/best' : 
                ext === 'm4a' ? 'bestaudio[ext=m4a]/best' : 'best[ext=mp4]/best',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        referer: 'https://www.youtube.com/'
      };
      
      console.log(`  Trying format: ${options.format}`);
      
      const result = await youtubedl(TEST_URL, options);
      
      if (fs.existsSync(outputFile)) {
        const stats = fs.statSync(outputFile);
        console.log(`  ✅ Success with .${ext}: ${stats.size} bytes`);
        
        // Clean up
        fs.unlinkSync(outputFile);
        return ext;
      } else {
        console.log(`  ❌ Failed with .${ext}`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error with .${ext}: ${error.message}`);
    }
  }
  
  return null;
}

async function listAllTempFiles() {
  console.log('📁 Current /tmp Contents:');
  console.log('-------------------------');
  
  try {
    const files = fs.readdirSync(TEST_DIR);
    console.log(`Total files in ${TEST_DIR}: ${files.length}`);
    
    if (files.length > 0) {
      console.log('Files:');
      files.slice(0, 20).forEach(file => { // Show first 20 files
        try {
          const stats = fs.statSync(path.join(TEST_DIR, file));
          const size = stats.isDirectory() ? '[DIR]' : `${stats.size}B`;
          console.log(`  ${file} (${size})`);
        } catch (err) {
          console.log(`  ${file} (error reading stats)`);
        }
      });
      
      if (files.length > 20) {
        console.log(`  ... and ${files.length - 20} more files`);
      }
    }
  } catch (error) {
    console.log(`❌ Could not list ${TEST_DIR}: ${error.message}`);
  }
}

async function main() {
  console.log('Starting comprehensive debug...\n');
  
  // List initial temp files
  await listAllTempFiles();
  console.log('');
  
  // Check environment
  const envOk = await checkEnvironment();
  if (!envOk) {
    console.log('❌ Environment check failed. Exiting.');
    return;
  }
  
  // Check yt-dlp
  const ytdlpOk = await checkYtDlp();
  console.log('');
  
  if (ytdlpOk) {
    // Test direct yt-dlp
    const directOk = await testDirectYtDlp();
    console.log('');
    
    if (directOk) {
      console.log('✅ Direct yt-dlp works! The issue is likely in the Node.js module or our code.');
    } else {
      console.log('❌ Direct yt-dlp failed. This is a yt-dlp or system issue.');
    }
  }
  
  // Test Node module regardless
  const nodeOk = await testNodeModule();
  console.log('');
  
  if (!nodeOk) {
    console.log('🔄 Trying different extensions...');
    const workingExt = await testWithDifferentExtensions();
    
    if (workingExt) {
      console.log(`✅ Found working extension: .${workingExt}`);
    } else {
      console.log('❌ No extensions worked');
    }
  }
  
  console.log('');
  console.log('🏁 Debug Complete');
  console.log('================');
  
  if (ytdlpOk && directOk && nodeOk) {
    console.log('✅ Everything works! The issue must be in your application code.');
  } else if (ytdlpOk && directOk && !nodeOk) {
    console.log('⚠️  yt-dlp works directly but not through Node module. Module or options issue.');
  } else if (!ytdlpOk) {
    console.log('❌ yt-dlp is not working. Installation or system issue.');
  } else {
    console.log('❌ Mixed results. Check the logs above for details.');
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
});

main().catch(console.error);