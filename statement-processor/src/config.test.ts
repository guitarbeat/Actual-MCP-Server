/**
 * Tests for CSV Import Tool configuration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, validateConfig } from './config.js';

describe('CSV Import Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load default configuration', () => {
      const config = loadConfig();

      expect(config.inputFile).toBe('ChaseChecking.CSV');
      expect(config.llmModel).toBe('gpt-4o-mini');
      expect(config.batchSize).toBe(10);
      expect(config.enableCaching).toBe(true);
    });

    it('should load configuration from environment variables', () => {
      process.env.CSV_INPUT_FILE = 'test-input.csv';
      process.env.CSV_OUTPUT_FILE = 'test-output.csv';
      process.env.LLM_MODEL = 'gpt-4';
      process.env.LLM_API_KEY = 'test-key';
      process.env.LLM_BATCH_SIZE = '20';
      process.env.LLM_RATE_LIMIT_DELAY = '2000';
      process.env.ENABLE_CATEGORIZATION_CACHE = 'false';

      const config = loadConfig();

      expect(config.inputFile).toBe('test-input.csv');
      expect(config.outputFile).toBe('test-output.csv');
      expect(config.llmModel).toBe('gpt-4');
      expect(config.llmApiKey).toBe('test-key');
      expect(config.batchSize).toBe(20);
      expect(config.rateLimitDelay).toBe(2000);
      expect(config.enableCaching).toBe(false);
    });

    it('should generate output filename with current date when not specified', () => {
      const config = loadConfig();
      const today = new Date().toISOString().split('T')[0];

      expect(config.outputFile).toContain('ChaseChecking_Cleaned_');
      expect(config.outputFile).toContain(today);
      expect(config.outputFile).toMatch(/\.csv$/);
    });
  });

  describe('validateConfig', () => {
    it('should throw error when LLM API key is missing', () => {
      const config = loadConfig();
      config.llmApiKey = '';

      expect(() => validateConfig(config)).toThrow('LLM_API_KEY environment variable is required');
    });

    it('should throw error when batch size is too small', () => {
      const config = loadConfig();
      config.llmApiKey = 'test-key';
      config.batchSize = 0;

      expect(() => validateConfig(config)).toThrow('LLM_BATCH_SIZE must be between 1 and 100');
    });

    it('should throw error when batch size is too large', () => {
      const config = loadConfig();
      config.llmApiKey = 'test-key';
      config.batchSize = 101;

      expect(() => validateConfig(config)).toThrow('LLM_BATCH_SIZE must be between 1 and 100');
    });

    it('should throw error when rate limit delay is negative', () => {
      const config = loadConfig();
      config.llmApiKey = 'test-key';
      config.rateLimitDelay = -1;

      expect(() => validateConfig(config)).toThrow('LLM_RATE_LIMIT_DELAY must be between 0 and 60000 milliseconds');
    });

    it('should throw error when rate limit delay is too large', () => {
      const config = loadConfig();
      config.llmApiKey = 'test-key';
      config.rateLimitDelay = 60001;

      expect(() => validateConfig(config)).toThrow('LLM_RATE_LIMIT_DELAY must be between 0 and 60000 milliseconds');
    });

    it('should not throw error with valid configuration', () => {
      const config = loadConfig();
      config.llmApiKey = 'test-key';

      expect(() => validateConfig(config)).not.toThrow();
    });
  });
});
