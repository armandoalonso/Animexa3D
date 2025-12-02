#!/usr/bin/env node

/**
 * Test setup and validation script
 * Ensures all test dependencies are installed and configured correctly
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Animexa3D Test Suite Setup\n');

// Check Node.js version
console.log('📋 Checking Node.js version...');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
  console.error('❌ Node.js 18 or higher is required');
  console.error(`   Current version: ${nodeVersion}`);
  process.exit(1);
}
console.log(`✅ Node.js ${nodeVersion}`);

// Check if package.json exists
console.log('\n📋 Checking package.json...');
if (!fs.existsSync('package.json')) {
  console.error('❌ package.json not found');
  process.exit(1);
}
console.log('✅ package.json found');

// Check test scripts
console.log('\n📋 Checking test scripts...');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['test', 'test:run', 'test:coverage', 'test:ui'];
const missingScripts = requiredScripts.filter(script => !pkg.scripts[script]);

if (missingScripts.length > 0) {
  console.error(`❌ Missing test scripts: ${missingScripts.join(', ')}`);
  process.exit(1);
}
console.log('✅ All test scripts configured');

// Check test dependencies
console.log('\n📋 Checking test dependencies...');
const requiredDeps = ['vitest', '@vitest/ui', '@vitest/coverage-v8', 'happy-dom'];
const missingDeps = requiredDeps.filter(dep => !pkg.devDependencies[dep]);

if (missingDeps.length > 0) {
  console.log(`⚠️  Missing dependencies: ${missingDeps.join(', ')}`);
  console.log('   Installing...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed');
  } catch (error) {
    console.error('❌ Failed to install dependencies');
    process.exit(1);
  }
} else {
  console.log('✅ All test dependencies present');
}

// Check test files exist
console.log('\n📋 Checking test files...');
const testFiles = [
  'tests/setup.js',
  'tests/utils/testHelpers.js',
  'tests/modules/AnimationManager.test.js',
  'tests/modules/RetargetManager.test.js',
  'tests/modules/ModelLoader.test.js',
  'tests/modules/CoordinateSystemDetector.test.js',
  'tests/integration/retargeting-workflow.test.js'
];

const missingFiles = testFiles.filter(file => !fs.existsSync(file));
if (missingFiles.length > 0) {
  console.error(`❌ Missing test files:\n   ${missingFiles.join('\n   ')}`);
  process.exit(1);
}
console.log(`✅ All ${testFiles.length} test files found`);

// Check vitest.config.js
console.log('\n📋 Checking Vitest configuration...');
if (!fs.existsSync('vitest.config.js')) {
  console.error('❌ vitest.config.js not found');
  process.exit(1);
}
console.log('✅ vitest.config.js found');

// Run a quick test
console.log('\n📋 Running quick test validation...');
try {
  execSync('npx vitest run tests/basic.test.js', { stdio: 'inherit' });
  console.log('\n✅ Test validation passed!');
} catch (error) {
  console.error('\n❌ Test validation failed');
  process.exit(1);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('✅ Test suite setup complete!\n');
console.log('Available commands:');
console.log('  npm test              - Run tests in watch mode');
console.log('  npm run test:run      - Run tests once');
console.log('  npm run test:ui       - Run tests with UI');
console.log('  npm run test:coverage - Run tests with coverage\n');
console.log('📖 For more information, see TESTING.md');
console.log('='.repeat(50) + '\n');
