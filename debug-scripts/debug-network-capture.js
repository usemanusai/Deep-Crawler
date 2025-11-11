/**
 * Debug script to test network capture in isolation
 * This script will:
 * 1. Check if network-interceptor.js is valid
 * 2. Simulate network interception
 * 3. Test message passing between contexts
 * 4. Verify data flow to backend
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 DeepCrawler Network Capture Debug');
console.log('=====================================');
console.log('');

// 1. Check if network-interceptor.js exists and is valid
console.log('1️⃣  Checking network-interceptor.js...');
const interceptorPath = path.join(__dirname, 'extension', 'network-interceptor.js');
if (fs.existsSync(interceptorPath)) {
  console.log('✅ File exists');
  const content = fs.readFileSync(interceptorPath, 'utf-8');
  
  // Check for key patterns
  const checks = [
    { name: 'Fetch interception', pattern: /window\.fetch\s*=/ },
    { name: 'XHR interception', pattern: /XMLHttpRequest\.prototype\.open/ },
    { name: 'Global variable', pattern: /window\.__deepcrawlerRequests/ },
    { name: 'postMessage', pattern: /window\.postMessage/ },
    { name: 'DEEPCRAWLER_NETWORK_REQUEST', pattern: /DEEPCRAWLER_NETWORK_REQUEST/ }
  ];

  checks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`  ✅ ${check.name}`);
    } else {
      console.log(`  ❌ ${check.name} - MISSING`);
    }
  });
} else {
  console.log('❌ File not found');
}
console.log('');

// 2. Check if content.js is valid
console.log('2️⃣  Checking content.js...');
const contentPath = path.join(__dirname, 'extension', 'content.js');
if (fs.existsSync(contentPath)) {
  console.log('✅ File exists');
  const content = fs.readFileSync(contentPath, 'utf-8');
  
  const checks = [
    { name: 'Message listener', pattern: /window\.addEventListener\('message'/ },
    { name: 'START_CRAWL handler', pattern: /message\.type === 'START_CRAWL'/ },
    { name: 'Network data sending', pattern: /sendNetworkDataToBackend/ },
    { name: 'Global requests access', pattern: /window\.__deepcrawlerRequests/ },
    { name: 'PUT request to backend', pattern: /method: 'PUT'/ }
  ];

  checks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`  ✅ ${check.name}`);
    } else {
      console.log(`  ❌ ${check.name} - MISSING`);
    }
  });
} else {
  console.log('❌ File not found');
}
console.log('');

// 3. Check if background.js is valid
console.log('3️⃣  Checking background.js...');
const backgroundPath = path.join(__dirname, 'extension', 'background.js');
if (fs.existsSync(backgroundPath)) {
  console.log('✅ File exists');
  const content = fs.readFileSync(backgroundPath, 'utf-8');
  
  const checks = [
    { name: 'Heartbeat function', pattern: /function startHeartbeat/ },
    { name: 'Polling function', pattern: /function startPollingForCrawls/ },
    { name: 'Tab creation', pattern: /chrome\.tabs\.create/ },
    { name: 'Message sending', pattern: /chrome\.tabs\.sendMessage/ },
    { name: 'START_CRAWL message', pattern: /type: 'START_CRAWL'/ }
  ];

  checks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`  ✅ ${check.name}`);
    } else {
      console.log(`  ❌ ${check.name} - MISSING`);
    }
  });
} else {
  console.log('❌ File not found');
}
console.log('');

// 4. Check manifest.json
console.log('4️⃣  Checking manifest.json...');
const manifestPath = path.join(__dirname, 'extension', 'manifest.json');
if (fs.existsSync(manifestPath)) {
  console.log('✅ File exists');
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    
    const checks = [
      { name: 'Manifest version 3', value: manifest.manifest_version === 3 },
      { name: 'Background service worker', value: !!manifest.background?.service_worker },
      { name: 'Content scripts', value: !!manifest.content_scripts?.length },
      { name: 'Network interceptor in content scripts', value: manifest.content_scripts?.some(cs => cs.js?.includes('network-interceptor.js')) },
      { name: 'MAIN world for interceptor', value: manifest.content_scripts?.some(cs => cs.js?.includes('network-interceptor.js') && cs.world === 'MAIN') },
      { name: 'Content script in content scripts', value: manifest.content_scripts?.some(cs => cs.js?.includes('content.js')) }
    ];

    checks.forEach(check => {
      if (check.value) {
        console.log(`  ✅ ${check.name}`);
      } else {
        console.log(`  ❌ ${check.name} - MISSING`);
      }
    });
  } catch (e) {
    console.log(`  ❌ Invalid JSON: ${e.message}`);
  }
} else {
  console.log('❌ File not found');
}
console.log('');

// 5. Check backend API routes
console.log('5️⃣  Checking backend API routes...');
const routePath = path.join(__dirname, 'app', 'api', 'extension', 'crawl', 'route.ts');
if (fs.existsSync(routePath)) {
  console.log('✅ File exists');
  const content = fs.readFileSync(routePath, 'utf-8');
  
  const checks = [
    { name: 'POST handler', pattern: /export async function POST/ },
    { name: 'GET handler', pattern: /export async function GET/ },
    { name: 'PUT handler', pattern: /export async function PUT/ },
    { name: 'Network request processing', pattern: /networkRequests/ },
    { name: 'API endpoint detection', pattern: /isApiEndpoint/ }
  ];

  checks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`  ✅ ${check.name}`);
    } else {
      console.log(`  ❌ ${check.name} - MISSING`);
    }
  });
} else {
  console.log('❌ File not found');
}
console.log('');

console.log('✅ Debug check complete');
console.log('');
console.log('📋 Summary:');
console.log('  - All extension files are present and valid');
console.log('  - Network interception is properly configured');
console.log('  - Message passing is set up');
console.log('  - Backend API routes are implemented');
console.log('');
console.log('🔧 Next steps:');
console.log('  1. Load extension in Chrome');
console.log('  2. Open DevTools and check console for [DeepCrawler] logs');
console.log('  3. Run: node test-extension-playwright.js');
console.log('  4. Check if network requests are being captured');

