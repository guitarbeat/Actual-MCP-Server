import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAvailableTools } from './index.js';

describe('Tool Registry', () => {
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
    it('should include all 21 core tools by default', () => {
      process.env.ENABLE_UTILITY_TOOLS = 'false';

      const tools = getAvailableTools(true);

      // Should have exactly 21 core tools
      expect(tools.length).toBe(21);

      // Core read tools
      expect(tools.some((t) => t.schema.name === 'get-transactions')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'get-accounts')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'get-grouped-categories')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'get-payees')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'get-rules')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'get-schedules')).toBe(true);

      // Core insight tools
      expect(tools.some((t) => t.schema.name === 'spending-by-category')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'monthly-summary')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'balance-history')).toBe(true);

      // Core write tools
      expect(tools.some((t) => t.schema.name === 'manage-transaction')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'update-account')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'set-budget')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'manage-entity')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'merge-payees')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'run-bank-sync')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'run-import')).toBe(true);

      // Budget tools (now core)
      expect(tools.some((t) => t.schema.name === 'get-budget-months')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'get-budget-month')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'hold-budget-for-next-month')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'reset-budget-hold')).toBe(true);

      // Payee rules (now core)
      expect(tools.some((t) => t.schema.name === 'get-payee-rules')).toBe(true);
    });

    it('should not include removed tools', () => {
      const tools = getAvailableTools(true);

      // Removed account management tools
      expect(tools.some((t) => t.schema.name === 'create-account')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'close-account')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'reopen-account')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'delete-account')).toBe(false);

      // Removed budget file management tools
      expect(tools.some((t) => t.schema.name === 'get-budgets')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'load-budget')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'download-budget')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'sync')).toBe(false);

      // Removed utility tools
      expect(tools.some((t) => t.schema.name === 'get-id-by-name')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'get-server-version')).toBe(false);
    });
  });

  describe('Utility tools (optional)', () => {
    it('should exclude utility tools when flag is disabled', () => {
      process.env.ENABLE_UTILITY_TOOLS = 'false';

      const tools = getAvailableTools(true);

      // run-query should not be present
      expect(tools.some((t) => t.schema.name === 'run-query')).toBe(false);
      expect(tools.length).toBe(21); // Only core tools
    });

    it('should include utility tools when flag is enabled', () => {
      process.env.ENABLE_UTILITY_TOOLS = 'true';

      const tools = getAvailableTools(true);

      // run-query should be present
      expect(tools.some((t) => t.schema.name === 'run-query')).toBe(true);
      expect(tools.length).toBe(22); // Core + 1 utility tool
    });
  });

  describe('Write permission filtering', () => {
    it('should exclude write tools when write is disabled', () => {
      process.env.ENABLE_UTILITY_TOOLS = 'false';

      const tools = getAvailableTools(false); // Write disabled

      // Read-only tools should be present
      expect(tools.some((t) => t.schema.name === 'get-transactions')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'get-accounts')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'get-budget-months')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'get-budget-month')).toBe(true);

      // Write tools should not be present
      expect(tools.some((t) => t.schema.name === 'manage-transaction')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'set-budget')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'manage-entity')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'hold-budget-for-next-month')).toBe(false);
    });
  });
});
