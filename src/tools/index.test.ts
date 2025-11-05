import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAvailableTools } from './index.js';

describe('Tool Registry with Feature Flags', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Core tools', () => {
    it('should always include core tools regardless of feature flags', () => {
      // Disable all optional features
      process.env.ENABLE_BUDGET_MANAGEMENT = 'false';
      process.env.ENABLE_ADVANCED_ACCOUNT_OPS = 'false';
      process.env.ENABLE_UTILITY_TOOLS = 'false';

      const tools = getAvailableTools(true);

      // Core tools should be present
      expect(tools.some((t) => t.schema.name === 'get-transactions')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'get-accounts')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'manage-transaction')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'set-budget')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'manage-entity')).toBe(true);
    });
  });

  describe('Budget management tools', () => {
    it('should exclude budget management tools when flag is disabled', () => {
      process.env.ENABLE_BUDGET_MANAGEMENT = 'false';

      const tools = getAvailableTools(true);

      // Budget management tools should not be present
      expect(tools.some((t) => t.schema.name === 'get-budgets')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'load-budget')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'download-budget')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'sync')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'set-budget-amount')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'set-budget-carryover')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'hold-budget-for-next-month')).toBe(false);
    });

    it('should include budget management tools when flag is enabled', () => {
      process.env.ENABLE_BUDGET_MANAGEMENT = 'true';

      const tools = getAvailableTools(true);

      // Budget management tools should be present
      expect(tools.some((t) => t.schema.name === 'get-budgets')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'load-budget')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'download-budget')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'sync')).toBe(true);
      // Deprecated tools removed - set-budget-amount and set-budget-carryover replaced by set-budget
      expect(tools.some((t) => t.schema.name === 'hold-budget-for-next-month')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'reset-budget-hold')).toBe(true);
    });
  });

  describe('Advanced account operations', () => {
    it('should exclude advanced account ops when flag is disabled', () => {
      process.env.ENABLE_ADVANCED_ACCOUNT_OPS = 'false';

      const tools = getAvailableTools(true);

      // Advanced account ops should not be present
      expect(tools.some((t) => t.schema.name === 'create-account')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'close-account')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'reopen-account')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'delete-account')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'get-account-balance')).toBe(false);
    });

    it('should include advanced account ops when flag is enabled', () => {
      process.env.ENABLE_ADVANCED_ACCOUNT_OPS = 'true';

      const tools = getAvailableTools(true);

      // Advanced account ops should be present
      expect(tools.some((t) => t.schema.name === 'create-account')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'close-account')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'reopen-account')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'delete-account')).toBe(true);
    });
  });

  describe('Utility tools', () => {
    it('should exclude utility tools when flag is disabled', () => {
      process.env.ENABLE_UTILITY_TOOLS = 'false';

      const tools = getAvailableTools(true);

      // Utility tools should not be present
      expect(tools.some((t) => t.schema.name === 'get-id-by-name')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'run-query')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'get-server-version')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'get-payee-rules')).toBe(false);
    });

    it('should include utility tools when flag is enabled', () => {
      process.env.ENABLE_UTILITY_TOOLS = 'true';

      const tools = getAvailableTools(true);

      // Utility tools should be present
      expect(tools.some((t) => t.schema.name === 'get-id-by-name')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'run-query')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'get-server-version')).toBe(true);
    });
  });

  describe('Write permission filtering', () => {
    it('should exclude write tools when write is disabled', () => {
      process.env.ENABLE_BUDGET_MANAGEMENT = 'true';
      process.env.ENABLE_ADVANCED_ACCOUNT_OPS = 'true';

      const tools = getAvailableTools(false); // Write disabled

      // Read-only tools should be present
      expect(tools.some((t) => t.schema.name === 'get-transactions')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'get-budgets')).toBe(true);

      // Write tools should not be present
      expect(tools.some((t) => t.schema.name === 'manage-transaction')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'load-budget')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'create-account')).toBe(false);
    });
  });

  describe('Combined feature flags', () => {
    it('should correctly filter with multiple flags enabled', () => {
      process.env.ENABLE_BUDGET_MANAGEMENT = 'true';
      process.env.ENABLE_ADVANCED_ACCOUNT_OPS = 'false';
      process.env.ENABLE_UTILITY_TOOLS = 'true';

      const tools = getAvailableTools(true);

      // Core tools should be present
      expect(tools.some((t) => t.schema.name === 'get-transactions')).toBe(true);

      // Budget management tools should be present
      expect(tools.some((t) => t.schema.name === 'get-budgets')).toBe(true);

      // Advanced account ops should not be present
      expect(tools.some((t) => t.schema.name === 'create-account')).toBe(false);

      // Utility tools should be present
      expect(tools.some((t) => t.schema.name === 'get-id-by-name')).toBe(true);
    });
  });
});
