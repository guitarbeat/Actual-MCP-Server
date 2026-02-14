/**
 * Configuration management for CSV Import Tool
 */

import { CSVImportConfig } from './types.js';

/**
 * Load configuration from environment variables and defaults
 */
export function loadConfig(): CSVImportConfig {
  return {
    inputFile: process.env.CSV_INPUT_FILE || 'ChaseChecking.CSV',
    outputFile:
      process.env.CSV_OUTPUT_FILE ||
      `ChaseChecking_Cleaned_${new Date().toISOString().split('T')[0]}.csv`,
    llmModel: process.env.LLM_MODEL || 'gpt-4o-mini',
    llmApiKey: process.env.LLM_API_KEY || '',
    batchSize: parseInt(process.env.LLM_BATCH_SIZE || '10', 10),
    rateLimitDelay: parseInt(process.env.LLM_RATE_LIMIT_DELAY || '1000', 10),
    enableCaching: process.env.ENABLE_CATEGORIZATION_CACHE !== 'false',
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: CSVImportConfig): void {
  if (!config.llmApiKey) {
    throw new Error('LLM_API_KEY environment variable is required');
  }

  if (config.batchSize < 1 || config.batchSize > 100) {
    throw new Error('LLM_BATCH_SIZE must be between 1 and 100');
  }

  if (config.rateLimitDelay < 0 || config.rateLimitDelay > 60000) {
    throw new Error('LLM_RATE_LIMIT_DELAY must be between 0 and 60000 milliseconds');
  }
}
