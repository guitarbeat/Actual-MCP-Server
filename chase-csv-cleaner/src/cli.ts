#!/usr/bin/env node
/**
 * CLI Interface for Chase CSV Import Preparation Tool
 * 
 * Accepts command-line arguments for input/output files and configuration options.
 */

import { parseArgs } from 'node:util';
import { CSVImportConfig } from './types.js';
import { generateOutputFilename } from './csv-formatter.js';

/**
 * CLI options parsed from command-line arguments
 */
export interface CLIOptions {
  inputFile: string;
  outputFile: string;
  llmModel: string;
  llmApiKey: string;
  batchSize: number;
  rateLimitDelay: number;
  enableCaching: boolean;
  startDate?: string;
  startingBalance?: number;
  help: boolean;
}

/**
 * Display help message
 */
export function displayHelp(): void {
  console.log(`
Chase CSV Import Preparation Tool
==================================

Transforms Chase checking account CSV exports into cleaned, categorized CSV files
optimized for Actual Budget import.

Usage:
  npm run csv-import -- [options]

Options:
  -i, --input <file>          Input Chase CSV file (default: ChaseChecking.CSV)
  -o, --output <file>         Output cleaned CSV file (default: auto-generated)
  -m, --model <model>         LLM model to use (default: gpt-4o-mini)
  -k, --api-key <key>         OpenAI API key (or set LLM_API_KEY env var)
  -b, --batch-size <size>     Batch size for LLM calls (default: 10)
  -d, --delay <ms>            Delay between batches in ms (default: 1000)
  --start-date <YYYY-MM-DD>   Filter transactions from this date (optional)
  --starting-balance <amount> Set custom starting balance (optional, requires --start-date)
  --no-cache                  Disable categorization caching
  -h, --help                  Display this help message

Environment Variables:
  LLM_API_KEY                 OpenAI API key (required if not provided via --api-key)
  LLM_MODEL                   LLM model to use
  LLM_BATCH_SIZE              Batch size for LLM calls
  LLM_RATE_LIMIT_DELAY        Delay between batches in milliseconds
  ENABLE_CATEGORIZATION_CACHE Enable/disable caching (true/false)

Examples:
  # Basic usage with API key from environment
  npm run csv-import -- -i ChaseChecking.CSV

  # Specify output file and model
  npm run csv-import -- -i input.csv -o output.csv -m gpt-4

  # Disable caching and use larger batches
  npm run csv-import -- -i input.csv --no-cache -b 20

  # Use API key from command line
  npm run csv-import -- -i input.csv -k sk-...

  # Filter transactions from a specific date with custom starting balance
  npm run csv-import -- -i input.csv --start-date 2025-08-01 --starting-balance 5000.00
`);
}

/**
 * Parse command-line arguments
 */
export function parseCommandLineArgs(argv: string[]): CLIOptions {
  try {
    const { values } = parseArgs({
      args: argv,
      options: {
        input: {
          type: 'string',
          short: 'i',
        },
        output: {
          type: 'string',
          short: 'o',
        },
        model: {
          type: 'string',
          short: 'm',
        },
        'api-key': {
          type: 'string',
          short: 'k',
        },
        'batch-size': {
          type: 'string',
          short: 'b',
        },
        delay: {
          type: 'string',
          short: 'd',
        },
        cache: {
          type: 'boolean',
          default: true,
        },
        'start-date': {
          type: 'string',
        },
        'starting-balance': {
          type: 'string',
        },
        help: {
          type: 'boolean',
          short: 'h',
          default: false,
        },
      },
      allowPositionals: false,
    });

    // Check if help was requested
    if (values.help) {
      return {
        inputFile: '',
        outputFile: '',
        llmModel: '',
        llmApiKey: '',
        batchSize: 0,
        rateLimitDelay: 0,
        enableCaching: true,
        help: true,
      };
    }

    // Get values with defaults
    const inputFile = values.input || process.env.CSV_INPUT_FILE || 'ChaseChecking.CSV';
    const outputFile = values.output || process.env.CSV_OUTPUT_FILE || generateOutputFilename();
    const llmModel = values.model || process.env.LLM_MODEL || 'gpt-4o-mini';
    const llmApiKey = values['api-key'] || process.env.LLM_API_KEY || '';
    const batchSize = parseInt(values['batch-size'] || process.env.LLM_BATCH_SIZE || '10', 10);
    const rateLimitDelay = parseInt(values.delay || process.env.LLM_RATE_LIMIT_DELAY || '1000', 10);
    const enableCaching = values.cache !== false && process.env.ENABLE_CATEGORIZATION_CACHE !== 'false';
    const startDate = values['start-date'];
    const startingBalance = values['starting-balance'] ? parseFloat(values['starting-balance']) : undefined;

    return {
      inputFile,
      outputFile,
      llmModel,
      llmApiKey,
      batchSize,
      rateLimitDelay,
      enableCaching,
      startDate,
      startingBalance,
      help: false,
    };
  } catch (error) {
    throw new Error(`Failed to parse command-line arguments: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate CLI options
 */
export function validateCLIOptions(options: CLIOptions): void {
  const errors: string[] = [];

  if (!options.inputFile) {
    errors.push('Input file is required. Use -i or --input to specify the Chase CSV file.');
  }

  if (!options.llmApiKey) {
    errors.push('LLM API key is required. Set LLM_API_KEY environment variable or use -k/--api-key option.');
  }

  if (options.batchSize < 1 || options.batchSize > 100) {
    errors.push('Batch size must be between 1 and 100.');
  }

  if (options.rateLimitDelay < 0 || options.rateLimitDelay > 60000) {
    errors.push('Rate limit delay must be between 0 and 60000 milliseconds.');
  }

  // Validate start date format if provided
  if (options.startDate && !options.startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    errors.push('Start date must be in YYYY-MM-DD format.');
  }

  // Validate starting balance if provided
  if (options.startingBalance !== undefined) {
    if (isNaN(options.startingBalance)) {
      errors.push('Starting balance must be a valid number.');
    }
    if (!options.startDate) {
      errors.push('Starting balance requires --start-date to be specified.');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid configuration:\n${errors.map(e => `  - ${e}`).join('\n')}`);
  }
}

/**
 * Convert CLI options to CSVImportConfig
 */
export function cliOptionsToConfig(options: CLIOptions): CSVImportConfig {
  return {
    inputFile: options.inputFile,
    outputFile: options.outputFile,
    llmModel: options.llmModel,
    llmApiKey: options.llmApiKey,
    batchSize: options.batchSize,
    rateLimitDelay: options.rateLimitDelay,
    enableCaching: options.enableCaching,
    startDate: options.startDate,
    startingBalance: options.startingBalance,
  };
}
