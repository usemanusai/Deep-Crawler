#!/usr/bin/env node

/**
 * Extension Loading Test Script
 * Verifies that all extension files are present and valid
 */

const fs = require('fs');
const path = require('path');

const extensionDir = path.join(__dirname, 'extension');

console.log('🔍 DeepCrawler Extension Verification\n');
console.log(`Extension directory: ${extensionDir}\n`);

// Required files
const requiredFiles = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.js',
  'popup.css',
  'options.html',
  'options.js',
  'options.css',
  'README.md'
];

let allFilesExist = true;
let manifestValid = false;

console.log('📋 Checking required files:\n');

requiredFiles.forEach(file => {
  const filePath = path.join(extensionDir, file);
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${file}`);
  
  if (!exists) {
    allFilesExist = false;
  }
});

console.log('\n📝 Validating manifest.json:\n');

try {
  const manifestPath = path.join(extensionDir, 'manifest.json');
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestContent);
  
  console.log('✅ manifest.json is valid JSON');
  console.log(`   Name: ${manifest.name}`);
  console.log(`   Version: ${manifest.version}`);
  console.log(`   Manifest Version: ${manifest.manifest_version}`);
  
  // Check required manifest fields
  const requiredFields = ['manifest_version', 'name', 'version', 'description'];
  let manifestValid = true;
  
  console.log('\n📋 Checking manifest fields:\n');
  
  requiredFields.forEach(field => {
    const hasField = field in manifest;
    const status = hasField ? '✅' : '❌';
    console.log(`${status} ${field}: ${hasField ? manifest[field] : 'MISSING'}`);
    
    if (!hasField) {
      manifestValid = false;
    }
  });
  
  // Check for problematic fields
  console.log('\n⚠️  Checking for problematic fields:\n');
  
  if (manifest.icons) {
    console.log('❌ manifest.icons found (should be removed)');
  } else {
    console.log('✅ No manifest.icons (correct)');
  }
  
  if (manifest.action && manifest.action.default_icons) {
    console.log('❌ action.default_icons found (should be removed)');
  } else {
    console.log('✅ No action.default_icons (correct)');
  }
  
  if (manifest.web_accessible_resources) {
    console.log('⚠️  web_accessible_resources found (not needed)');
  } else {
    console.log('✅ No web_accessible_resources (correct)');
  }
  
} catch (error) {
  console.log(`❌ Error reading manifest.json: ${error.message}`);
  manifestValid = false;
}

console.log('\n' + '='.repeat(50));
console.log('\n📊 Summary:\n');

if (allFilesExist) {
  console.log('✅ All required files exist');
} else {
  console.log('❌ Some required files are missing');
}

if (manifestValid) {
  console.log('✅ manifest.json is valid');
} else {
  console.log('❌ manifest.json has issues');
}

console.log('\n' + '='.repeat(50));

if (allFilesExist && manifestValid) {
  console.log('\n✅ Extension is ready to load!\n');
  console.log('Next steps:');
  console.log('1. Open Chrome');
  console.log('2. Go to chrome://extensions/');
  console.log('3. Enable "Developer mode"');
  console.log('4. Click "Load unpacked"');
  console.log(`5. Select: ${extensionDir}`);
  console.log('\n');
  process.exit(0);
} else {
  console.log('\n❌ Extension has issues. Please fix them before loading.\n');
  process.exit(1);
}

