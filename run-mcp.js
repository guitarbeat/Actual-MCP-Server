#!/usr/bin/env node
/**
 * Wrapper script to run Actual MCP Server with .env file support
 * This ensures the .env file is loaded from the project directory
 * even when Cursor runs the server from a different working directory.
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Get the directory where this script is located
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Main async function
async function main() {
  // Path to the project directory (where .env should be)
  const projectDir = __dirname;
  const envPath = join(projectDir, '.env');

  // Load environment variables from .env file if it exists
  if (existsSync(envPath)) {
    // Use dotenv to load the .env file
    const dotenv = await import('dotenv');
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      console.error('Warning: Failed to load .env file:', result.error);
    }
  }

  // Path to the built server
  const serverPath = join(projectDir, 'build', 'index.js');

  // Get command line arguments (pass through --enable-write and others)
  const args = process.argv.slice(2);

  // Spawn the server process
  const serverProcess = spawn('node', [serverPath, ...args], {
    stdio: 'inherit',
    cwd: projectDir,
    env: {
      ...process.env, // Include all current environment variables (including loaded from .env)
    },
  });

  // Forward exit code
  serverProcess.on('exit', (code) => {
    process.exit(code || 0);
  });

  serverProcess.on('error', (error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

// Run the main function
main().catch((error) => {
  console.error('Failed to start wrapper:', error);
  process.exit(1);
});
