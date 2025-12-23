#!/usr/bin/env node
/**
 * Main entry point for Chase CSV Import Preparation Tool
 * 
 * This is the CLI application that users run to transform Chase CSV files
 * into cleaned, categorized CSV files ready for Actual Budget import.
 */

import { parseCommandLineArgs, validateCLIOptions, cliOptionsToConfig, displayHelp } from './cli.js';
import { processChaseCSV } from './process-statement-logic.js';
import { CSVImportError, formatErrorForUser } from './handle-errors.js';

/**
 * Format elapsed time in human-readable format
 */
function formatElapsedTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Display progress bar
 */
function displayProgress(stage: string, current: number, total: number): void {
  const percentage = Math.floor((current / total) * 100);
  const barLength = 30;
  const filledLength = Math.floor((current / total) * barLength);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
  
  // Clear line and write progress
  process.stdout.write(`\r   ${stage}: [${bar}] ${percentage}% (${current}/${total})`);
  
  // Add newline when complete
  if (current === total) {
    process.stdout.write('\n');
  }
}

/**
 * Display summary statistics
 */
function displaySummary(result: any, elapsedTime: number): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Processing Summary`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Input file:           ${result.inputFile}`);
  console.log(`Output file:          ${result.outputFile}`);
  console.log(`Transactions:         ${result.transactionsProcessed} processed, ${result.transactionsFailed} failed`);
  console.log(`Starting balance:     $${result.startingBalance.toFixed(2)}`);
  console.log(`Processing time:      ${formatElapsedTime(elapsedTime)}`);
  console.log(`${'='.repeat(60)}`);
  
  if (result.errors.length > 0) {
    console.log(`\n⚠️  Warnings and errors:`);
    result.errors.slice(0, 5).forEach((error: string, index: number) => {
      console.log(`   ${index + 1}. ${error}`);
    });
    if (result.errors.length > 5) {
      console.log(`   ... and ${result.errors.length - 5} more`);
    }
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Display banner
    console.log(`
╔════════════════════════════════════════════════════════════╗
║   Chase CSV Import Preparation Tool                       ║
║   Transform Chase CSV for Actual Budget                   ║
╚════════════════════════════════════════════════════════════╝
`);

    // Parse command-line arguments
    const options = parseCommandLineArgs(process.argv.slice(2));

    // Display help if requested
    if (options.help) {
      displayHelp();
      process.exit(0);
    }

    // Validate options
    validateCLIOptions(options);

    // Convert to config
    const config = cliOptionsToConfig(options);

    // Display configuration
    console.log(`Configuration:`);
    console.log(`  Input:  ${config.inputFile}`);
    console.log(`  Output: ${config.outputFile}`);
    console.log(`  Model:  ${config.llmModel}`);
    console.log(`  Cache:  ${config.enableCaching ? 'enabled' : 'disabled'}`);

    // Start processing
    const startTime = Date.now();
    
    const result = await processChaseCSV(config, (stage, current, total) => {
      displayProgress(stage, current, total);
    });

    const elapsedTime = Date.now() - startTime;

    // Display results
    if (result.success) {
      console.log(`\n✅ Success! CSV file has been processed and saved.`);
      displaySummary(result, elapsedTime);
      
      console.log(`\n💡 Next steps:`);
      console.log(`   1. Open Actual Budget`);
      console.log(`   2. Go to your checking account`);
      console.log(`   3. Click "Import" and select: ${result.outputFile}`);
      console.log(`   4. Review and confirm the imported transactions\n`);
      
      process.exit(0);
    } else {
      console.error(`\n❌ Processing failed!`);
      if (result.errors.length > 0) {
        console.error(`\nErrors:`);
        result.errors.forEach((error, index) => {
          console.error(`  ${index + 1}. ${error}`);
        });
      }
      process.exit(1);
    }
  } catch (error) {
    // Handle errors with user-friendly messages
    if (error instanceof CSVImportError) {
      console.error(`\n${formatErrorForUser(error)}`);
      
      // Show technical details in verbose mode or for debugging
      if (process.env.DEBUG === 'true' && error.originalError) {
        console.error(`\nTechnical details:`);
        console.error(error.originalError.stack || error.originalError.message);
      }
    } else {
      console.error(`\n❌ Fatal error: ${error instanceof Error ? error.message : String(error)}`);
      
      if (error instanceof Error && error.stack && process.env.DEBUG === 'true') {
        console.error(`\nStack trace:`);
        console.error(error.stack);
      }
    }
    
    console.error(`\nFor help, run: npm run csv-import -- --help\n`);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error(`Unhandled error: ${error}`);
  process.exit(1);
});
