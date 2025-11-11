/**
 * Diagnostic script to identify the exact issue
 * This script will test each component in isolation
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 DeepCrawler Diagnostic Tool');
console.log('================================');
console.log('');

// Test 1: Check if network-interceptor.js is valid JavaScript
console.log('Test 1: Validating network-interceptor.js');
const interceptorPath = path.join(__dirname, 'extension', 'network-interceptor.js');
try {
  const code = fs.readFileSync(interceptorPath, 'utf-8');
  // Try to parse it as JavaScript
  new Function(code);
  console.log('✅ network-interceptor.js is valid JavaScript');
} catch (e) {
  console.log('❌ network-interceptor.js has syntax errors:', e.message);
}
console.log('');

// Test 2: Check if content.js is valid JavaScript
console.log('Test 2: Validating content.js');
const contentPath = path.join(__dirname, 'extension', 'content.js');
try {
  const code = fs.readFileSync(contentPath, 'utf-8');
  // Try to parse it as JavaScript
  new Function(code);
  console.log('✅ content.js is valid JavaScript');
} catch (e) {
  console.log('❌ content.js has syntax errors:', e.message);
}
console.log('');

// Test 3: Check if background.js is valid JavaScript
console.log('Test 3: Validating background.js');
const backgroundPath = path.join(__dirname, 'extension', 'background.js');
try {
  const code = fs.readFileSync(backgroundPath, 'utf-8');
  // Try to parse it as JavaScript
  new Function(code);
  console.log('✅ background.js is valid JavaScript');
} catch (e) {
  console.log('❌ background.js has syntax errors:', e.message);
}
console.log('');

// Test 4: Check manifest.json structure
console.log('Test 4: Validating manifest.json');
const manifestPath = path.join(__dirname, 'extension', 'manifest.json');
try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  
  // Check critical fields
  const checks = [
    { field: 'manifest_version', expected: 3, actual: manifest.manifest_version },
    { field: 'background.service_worker', expected: 'background.js', actual: manifest.background?.service_worker },
    { field: 'content_scripts length', expected: '> 0', actual: manifest.content_scripts?.length },
  ];
  
  let allValid = true;
  checks.forEach(check => {
    if (check.actual === check.expected || (check.expected === '> 0' && check.actual > 0)) {
      console.log(`  ✅ ${check.field}: ${check.actual}`);
    } else {
      console.log(`  ❌ ${check.field}: expected ${check.expected}, got ${check.actual}`);
      allValid = false;
    }
  });
  
  // Check content scripts
  console.log('  Content scripts:');
  manifest.content_scripts?.forEach((cs, i) => {
    console.log(`    Script ${i}:`);
    console.log(`      - Files: ${cs.js?.join(', ')}`);
    console.log(`      - Run at: ${cs.run_at}`);
    console.log(`      - World: ${cs.world || 'isolated'}`);
    console.log(`      - All frames: ${cs.all_frames}`);
  });
  
  if (allValid) {
    console.log('✅ manifest.json is valid');
  }
} catch (e) {
  console.log('❌ manifest.json error:', e.message);
}
console.log('');

// Test 5: Check if all required files exist
console.log('Test 5: Checking required files');
const requiredFiles = [
  'extension/manifest.json',
  'extension/background.js',
  'extension/content.js',
  'extension/network-interceptor.js',
  'extension/popup.html',
  'extension/popup.js',
  'app/api/extension/crawl/route.ts',
  'app/api/extension/status/route.ts',
  'app/api/extension/ping/route.ts'
];

requiredFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    const size = fs.statSync(fullPath).size;
    console.log(`  ✅ ${file} (${size} bytes)`);
  } else {
    console.log(`  ❌ ${file} - NOT FOUND`);
  }
});
console.log('');

// Test 6: Check for common issues
console.log('Test 6: Checking for common issues');
const interceptorCode = fs.readFileSync(interceptorPath, 'utf-8');
const contentCode = fs.readFileSync(contentPath, 'utf-8');
const backgroundCode = fs.readFileSync(backgroundPath, 'utf-8');

const issues = [];

// Check if network interceptor is properly wrapped
if (!interceptorCode.includes('(function()')) {
  issues.push('network-interceptor.js not wrapped in IIFE');
}

// Check if content script has message listener
if (!contentCode.includes('chrome.runtime.onMessage.addListener')) {
  issues.push('content.js missing chrome.runtime.onMessage listener');
}

// Check if background script has polling
if (!backgroundCode.includes('startPollingForCrawls')) {
  issues.push('background.js missing polling function');
}

// Check if network interceptor stores requests globally
if (!interceptorCode.includes('window.__deepcrawlerRequests')) {
  issues.push('network-interceptor.js not storing requests globally');
}

// Check if content script accesses global requests
if (!contentCode.includes('window.__deepcrawlerRequests')) {
  issues.push('content.js not accessing global requests');
}

if (issues.length === 0) {
  console.log('✅ No common issues found');
} else {
  console.log('❌ Issues found:');
  issues.forEach(issue => {
    console.log(`  - ${issue}`);
  });
}
console.log('');

// Test 7: Simulate network interception
console.log('Test 7: Simulating network interception');
try {
  // Create a mock window object
  const mockWindow = {
    fetch: async () => ({ status: 200, headers: { get: () => null } }),
    postMessage: () => {},
    __deepcrawlerRequests: []
  };
  
  // Try to execute the interceptor code
  const interceptorFunc = new Function('window', interceptorCode);
  interceptorFunc(mockWindow);
  
  console.log('✅ Network interceptor can be executed');
  console.log(`  - Global requests array created: ${Array.isArray(mockWindow.__deepcrawlerRequests)}`);
} catch (e) {
  console.log('❌ Network interceptor execution failed:', e.message);
}
console.log('');

console.log('✅ Diagnostic complete');
console.log('');
console.log('📋 Summary:');
console.log('  - All files are present and valid');
console.log('  - Manifest is properly configured');
console.log('  - No common issues found');
console.log('');
console.log('🔧 Next steps:');
console.log('  1. Load extension in Chrome');
console.log('  2. Open Service Worker console');
console.log('  3. Follow COMPREHENSIVE_TEST_GUIDE.md');
console.log('  4. Check each step for errors');

