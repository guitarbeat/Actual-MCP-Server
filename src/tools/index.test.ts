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
    it('should include all 19 core tools by default', () => {
      const tools = getAvailableTools(true);

      // Should have exactly 19 core tools (removed get-server-info)
      expect(tools.length).toBe(19);

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
      expect(tools.some((t) => t.schema.name === 'manage-account')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'set-budget')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'manage-entity')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'merge-payees')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'import-transactions')).toBe(true);

      // Budget tools (consolidated)
      expect(tools.some((t) => t.schema.name === 'get-budget')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'manage-budget-hold')).toBe(true);

      // Budget file management tools (newly added)
      expect(tools.some((t) => t.schema.name === 'get-budgets')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'switch-budget')).toBe(true);

      // get-server-info removed (not helpful)

      // Consolidated tools should not exist
      expect(tools.some((t) => t.schema.name === 'get-budget-months')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'get-budget-month')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'hold-budget-for-next-month')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'reset-budget-hold')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'get-payee-rules')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'run-bank-sync')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'run-import')).toBe(false);
    });

    it('should not include removed tools', () => {
      const tools = getAvailableTools(true);

      // Removed account management tools (now consolidated into manage-account)
      expect(tools.some((t) => t.schema.name === 'create-account')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'close-account')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'reopen-account')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'delete-account')).toBe(false);

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
      expect(tools.some((t) => t.schema.name === 'manage-transaction')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'set-budget')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'manage-entity')).toBe(false);
      expect(tools.some((t) => t.schema.name === 'manage-budget-hold')).toBe(false);
    });
  });

  describe('manage-transaction tool permissions', () => {
    it('should mark manage-transaction as requiresWrite: true', () => {
      const tools = getAvailableTools(true);
      const manageTxTool = tools.find((t) => t.schema.name === 'manage-transaction');

      expect(manageTxTool).toBeDefined();
      expect(manageTxTool?.requiresWrite).toBe(true);
    });

    it('should exclude manage-transaction when write is disabled', () => {
      const tools = getAvailableTools(false);
      const manageTxTool = tools.find((t) => t.schema.name === 'manage-transaction');

      expect(manageTxTool).toBeUndefined();
    });

    it('should include delete operation in manage-transaction schema', () => {
      const tools = getAvailableTools(true);
      const manageTxTool = tools.find((t) => t.schema.name === 'manage-transaction');

      expect(manageTxTool).toBeDefined();
      expect(manageTxTool?.schema.description).toContain('delete');
      expect(manageTxTool?.schema.description).toContain('Delete is permanent');

      // Check that the schema includes delete in the operation enum
      const inputSchema = manageTxTool?.schema.inputSchema as any;
      expect(inputSchema.properties.operation.enum).toContain('delete');
    });
  });
});
