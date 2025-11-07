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
    it('should include all 41 core tools by default', () => {
      const tools = getAvailableTools(true);

      // Should have exactly 41 core tools (CRUD layout + split budget hold)
      expect(tools.length).toBe(41);

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

      // Transaction CRUD tools
      expect(tools.some((t) => t.schema.name === 'create-transaction')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'update-transaction')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'delete-transaction')).toBe(true);

      // Account CRUD tools
      expect(tools.some((t) => t.schema.name === 'create-account')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'update-account')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'delete-account')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'close-account')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'reopen-account')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'get-account-balance')).toBe(true);

      // Category CRUD tools
      expect(tools.some((t) => t.schema.name === 'create-category')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'update-category')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'delete-category')).toBe(true);

      // Category Group CRUD tools
      expect(tools.some((t) => t.schema.name === 'create-category-group')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'update-category-group')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'delete-category-group')).toBe(true);

      // Payee CRUD tools
      expect(tools.some((t) => t.schema.name === 'create-payee')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'update-payee')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'delete-payee')).toBe(true);

      // Rule CRUD tools
      expect(tools.some((t) => t.schema.name === 'create-rule')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'update-rule')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'delete-rule')).toBe(true);

      // Schedule CRUD tools
      expect(tools.some((t) => t.schema.name === 'create-schedule')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'update-schedule')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'delete-schedule')).toBe(true);

      // Other write tools
      expect(tools.some((t) => t.schema.name === 'set-budget')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'merge-payees')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'import-transactions')).toBe(true);

      // Budget tools
      expect(tools.some((t) => t.schema.name === 'get-budget')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'hold-budget')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'reset-budget-hold')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'get-budgets')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'switch-budget')).toBe(true);

      // Deprecated tools removed
      expect(tools.some((t) => t.schema.name === 'manage-entity')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'manage-transaction')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'manage-account')).toBe(false);
    });

    it('should not include removed tools', () => {
      const tools = getAvailableTools(true);

      // Deprecated consolidated tool removed
      expect(tools.some((t) => t.schema.name === 'manage-entity')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'manage-transaction')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'manage-account')).toBe(false);

      // Removed utility tools
      expect(tools.some((t) => t.schema.name === 'get-server-info')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'load-budget')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'download-budget')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'sync')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'get-id-by-name')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'get-server-version')).toBe(false);
    });
  });

  describe('Write permission filtering', () => {
    it('should exclude write tools when write is disabled', () => {
      process.env.ENABLE_UTILITY_TOOLS = 'false';

      const tools = getAvailableTools(false); // Write disabled

      // Read-only tools should be present
      expect(tools.some((t) => t.schema.name === 'get-transactions')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'get-accounts')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'get-budget')).toBe(true);

      // Write tools should not be present
      expect(tools.some((t) => t.schema.name === 'set-budget')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'create-transaction')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'create-account')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'hold-budget')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'reset-budget-hold')).toBe(false);
    });
  });
});
