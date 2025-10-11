#!/usr/bin/env node

/**
 * Setup Verification Script
 * Run this to check if your environment is properly configured
 * 
 * Usage: node test-setup.js
 */

console.log('\n🔍 Prescription Assistant - Setup Verification\n');
console.log('='.repeat(50));

// Load environment variables
require('dotenv').config();

let hasErrors = false;

// Test 1: Check Node.js version
console.log('\n✓ Node.js Version Check:');
const nodeVersion = process.version;
console.log(`  Current version: ${nodeVersion}`);
if (parseInt(nodeVersion.slice(1)) < 18) {
  console.log('  ⚠️  Warning: Node.js 18 or higher is recommended');
  hasErrors = true;
} else {
  console.log('  ✅ Version is compatible');
}

// Test 2: Check required packages
console.log('\n✓ Checking Required Packages:');
const requiredPackages = [
  'next',
  'react',
  'lucide-react',
  '@google-cloud/speech',
  'openai'
];

requiredPackages.forEach(pkg => {
  try {
    require.resolve(pkg);
    console.log(`  ✅ ${pkg} is installed`);
  } catch (e) {
    console.log(`  ❌ ${pkg} is NOT installed`);
    hasErrors = true;
  }
});

// Test 3: Check environment variables
console.log('\n✓ Checking Environment Variables:');

const requiredEnvVars = [
  'GOOGLE_CLOUD_PROJECT_ID',
  'GOOGLE_CLOUD_CREDENTIALS',
  'OPENAI_API_KEY'
];

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`  ✅ ${varName} is set`);
    
    // Additional validation
    if (varName === 'OPENAI_API_KEY') {
      if (value.startsWith('sk-')) {
        console.log(`     → Format looks correct (starts with 'sk-')`);
      } else {
        console.log(`     ⚠️  Warning: Should start with 'sk-'`);
        hasErrors = true;
      }
    }
    
    if (varName === 'GOOGLE_CLOUD_CREDENTIALS') {
      try {
        const creds = JSON.parse(value);
        if (creds.type === 'service_account') {
          console.log(`     → Valid service account JSON`);
        } else {
          console.log(`     ⚠️  Warning: Not a service account`);
          hasErrors = true;
        }
      } catch (e) {
        console.log(`     ❌ Invalid JSON format`);
        hasErrors = true;
      }
    }
  } else {
    console.log(`  ❌ ${varName} is NOT set`);
    hasErrors = true;
  }
});

// Test 4: Check .env file exists
console.log('\n✓ Checking .env File:');
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
  console.log(`  ✅ .env file exists at: ${envPath}`);
} else {
  console.log(`  ❌ .env file not found!`);
  console.log(`     Create one at: ${envPath}`);
  hasErrors = true;
}

// Test 5: Quick Google Cloud validation
console.log('\n✓ Validating Google Cloud Configuration:');
if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
  try {
    const creds = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
    
    if (creds.project_id === process.env.GOOGLE_CLOUD_PROJECT_ID) {
      console.log(`  ✅ Project ID matches credentials`);
    } else {
      console.log(`  ⚠️  Project ID mismatch!`);
      console.log(`     GOOGLE_CLOUD_PROJECT_ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID}`);
      console.log(`     Credentials project_id: ${creds.project_id}`);
      hasErrors = true;
    }
    
    if (creds.private_key) {
      console.log(`  ✅ Private key is present`);
    } else {
      console.log(`  ❌ Private key is missing`);
      hasErrors = true;
    }
    
    if (creds.client_email) {
      console.log(`  ✅ Client email: ${creds.client_email}`);
    }
  } catch (e) {
    console.log(`  ❌ Could not parse Google Cloud credentials`);
    hasErrors = true;
  }
}

// Test 6: Check Next.js configuration
console.log('\n✓ Checking Next.js Configuration:');
const nextConfigPath = path.join(__dirname, 'next.config.ts');
if (fs.existsSync(nextConfigPath)) {
  console.log(`  ✅ next.config.ts exists`);
} else {
  console.log(`  ⚠️  next.config.ts not found`);
}

// Test 7: Check key directories and files
console.log('\n✓ Checking Project Structure:');
const requiredPaths = [
  'app/page.tsx',
  'app/api/transcribe/route.ts',
  'app/api/analyze/route.ts',
  'app/components/RecordingControls.tsx',
  'app/components/TranscriptionDisplay.tsx',
  'app/components/MedicalAnalysis.tsx',
  'package.json'
];

requiredPaths.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${filePath}`);
  } else {
    console.log(`  ❌ ${filePath} is missing`);
    hasErrors = true;
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('\n📊 Setup Summary:\n');

if (hasErrors) {
  console.log('❌ Setup is INCOMPLETE. Please fix the errors above.\n');
  console.log('📖 For help, see:');
  console.log('   - QUICKFIX.md (quick setup)');
  console.log('   - INSTALLATION.md (detailed guide)');
  console.log('   - README.md (full documentation)\n');
  process.exit(1);
} else {
  console.log('✅ All checks passed! Your setup looks good.\n');
  console.log('🚀 You can now run: npm run dev\n');
  console.log('📱 Then open: http://localhost:3000\n');
  process.exit(0);
}

