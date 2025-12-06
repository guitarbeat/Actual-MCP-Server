#!/usr/bin/env tsx
/**
 * Deployment diagnostic script
 * Checks environment variables, connectivity, and configuration
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

console.log('🔍 Deployment Diagnostic Check\n');
console.log('═'.repeat(60));

// Check environment variables
console.log('\n📋 Environment Variables:');
const requiredVars = [
  'ACTUAL_SERVER_URL',
  'ACTUAL_PASSWORD',
  'ACTUAL_BUDGET_SYNC_ID',
] as const;

const optionalVars = ['BEARER_TOKEN', 'PORT', 'DEBUG_PERFORMANCE'] as const;

let allRequiredPresent = true;

for (const varName of requiredVars) {
  const value = process.env[varName];
  if (value) {
    // Mask sensitive values
    const displayValue =
      varName === 'ACTUAL_PASSWORD' || varName === 'BEARER_TOKEN'
        ? '*'.repeat(Math.min(value.length, 20)) + '...'
        : value;
    console.log(`  ✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`  ❌ ${varName}: NOT SET`);
    allRequiredPresent = false;
  }
}

console.log('\n📋 Optional Variables:');
for (const varName of optionalVars) {
  const value = process.env[varName];
  if (value) {
    console.log(`  ✅ ${varName}: ${value}`);
  } else {
    console.log(`  ⚠️  ${varName}: not set (using default)`);
  }
}

// Check build artifacts
console.log('\n📦 Build Artifacts:');
const buildPath = join(process.cwd(), 'build', 'index.js');
if (existsSync(buildPath)) {
  console.log(`  ✅ build/index.js exists`);
} else {
  console.log(`  ❌ build/index.js NOT FOUND - Run 'npm run build' first`);
}

// Check Node.js version
console.log('\n🟢 Node.js Version:');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
console.log(`  Version: ${nodeVersion}`);
if (majorVersion >= 20) {
  console.log(`  ✅ Node.js version is compatible (>= 20.0.0)`);
} else {
  console.log(`  ❌ Node.js version too old (requires >= 20.0.0)`);
}

// Check port
console.log('\n🌐 Port Configuration:');
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
console.log(`  Port: ${port}`);
if (port > 0 && port < 65536) {
  console.log(`  ✅ Port is valid`);
} else {
  console.log(`  ❌ Port is invalid`);
}

// Test Actual Budget connection
console.log('\n🔌 Actual Budget Connection Test:');
const actualUrl = process.env.ACTUAL_SERVER_URL;
if (actualUrl) {
  console.log(`  Testing connection to: ${actualUrl}`);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${actualUrl}/api/health`, {
      signal: controller.signal,
      method: 'GET',
      headers: {
        'User-Agent': 'Actual-MCP-Server/1.2.0',
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log(`  ✅ Connection successful (${response.status})`);
    } else {
      console.log(`  ⚠️  Connection returned status ${response.status}`);
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log(`  ❌ Connection timeout (5s) - server may be unreachable`);
    } else {
      console.log(`  ❌ Connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} else {
  console.log(`  ⚠️  ACTUAL_SERVER_URL not set, skipping connection test`);
}

// Summary
console.log('\n' + '═'.repeat(60));
console.log('\n📊 Summary:');

if (allRequiredPresent) {
  console.log('  ✅ All required environment variables are set');
} else {
  console.log('  ❌ Some required environment variables are missing');
}

if (existsSync(buildPath)) {
  console.log('  ✅ Build artifacts found');
} else {
  console.log('  ❌ Build artifacts missing - run "npm run build"');
}

if (majorVersion >= 20) {
  console.log('  ✅ Node.js version compatible');
} else {
  console.log('  ❌ Node.js version incompatible');
}

console.log('\n💡 Next Steps:');
if (!allRequiredPresent) {
  console.log('  1. Set all required environment variables in Easy Panel');
}
if (!existsSync(buildPath)) {
  console.log('  2. Run "npm run build" to create build artifacts');
}
if (majorVersion < 20) {
  console.log('  3. Ensure Node.js >= 20.0.0 is available');
}
console.log('  4. Check Easy Panel logs for runtime errors');
console.log('  5. Verify port is exposed and accessible');
console.log('  6. Test server endpoint: curl http://your-domain:PORT/\n');
