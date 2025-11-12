// ----------------------------
// CRUD FACTORY CONFIGURATION
// Centralized entity configurations for CRUD tool generation
// ----------------------------

/**
 * @fileoverview Entity configurations for CRUD tool generation
 * 
 * This file contains all entity configurations used by the CRUD factory to generate
 * create, update, and delete tools. Each configuration defines:
 * - Zod schemas for input validation
 * - Tool descriptions for LLMs
 * - Entity handler class
 * - Permission and feature flag metadata
 * 
 * To add a new entity type:
 * 1. Define Zod schemas for create, update, and delete operations
 * 2. Add entity configuration to `entityConfigurations` object
 * 3. Generate tools in `tools/index.ts` using `createCRUDTools()`
 * 
 * @example Adding a new entity
 * ```typescript
 * // 1. Define schemas
 * const CreateWidgetSchema = z.object({
 *   name: z.string().min(1),
 *   type: z.enum(['foo', 'bar']),
 * });
 * 
 * // 2. Add to entityConfigurations
 * export const entityConfigurations = {
 *   // ... existing entities
 *   widget: {
 *     entityName: 'widget',
 *     displayName: 'widget',
 *     handlerClass: WidgetHandler,
 *     create: {
 *       schema: CreateWidgetSchema,
 *       description: 'Create a new widget...',
 *       requiresWrite: true,
 *       category: 'core',
 *     },
 *     // ... update and delete configs
 *   },
 * };
 * 
 * // 3. Generate tools in tools/index.ts
 * const widgetTools = createCRUDTools(entityConfigurations.widget);
 * ```
 */

import { z } from 'zod';
import { CategoryHandler } from './manage-entity/entity-handlers/category-handler.js';
import { PayeeHandler } from './manage-entity/entity-handlers/payee-handler.js';
import { AccountHandler } from './manage-entity/entity-handlers/account-handler.js';
import { RuleHandler } from './manage-entity/entity-handlers/rule-handler.js';
import { CategoryGroupHandler } from './manage-entity/entity-handlers/category-group-handler.js';
import { RuleDataSchema } from './manage-entity/types.js';
import type { EntityCRUDConfig } from './crud-factory.js';

// ----------------------------
// CATEGORY SCHEMAS
// ----------------------------

const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  groupId: z.string().uuid('Group ID must be a valid UUID'),
});

const UpdateCategorySchema = z.object({
  id: z.string().uuid('Category ID must be a valid UUID'),
  name: z.string().min(1).optional(),
  groupId: z.string().uuid().optional(),
});

const DeleteCategorySchema = z.object({
  id: z.string().uuid('Category ID must be a valid UUID'),
});

// ----------------------------
// PAYEE SCHEMAS
// ----------------------------

const CreatePayeeSchema = z.object({
  name: z.string().min(1, 'Payee name is required'),
  transferAccount: z.string().optional(),
});

const UpdatePayeeSchema = z.object({
  id: z.string().uuid('Payee ID must be a valid UUID'),
  name: z.string().min(1).optional(),
  transferAccount: z.string().optional(),
});

const DeletePayeeSchema = z.object({
  id: z.string().uuid('Payee ID must be a valid UUID'),
});

// ----------------------------
// ACCOUNT SCHEMAS
// ----------------------------

const CreateAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.enum(['checking', 'savings', 'credit', 'investment', 'mortgage', 'debt', 'other'], {
    errorMap: () => ({
      message: 'Account type must be one of: checking, savings, credit, investment, mortgage, debt, other',
    }),
  }),
  offbudget: z.boolean().optional(),
  initialBalance: z.number().optional(), // In cents
});

const UpdateAccountSchema = z.object({
  id: z.string().uuid('Account ID must be a valid UUID'),
  name: z.string().min(1).optional(),
  type: z.enum(['checking', 'savings', 'credit', 'investment', 'mortgage', 'debt', 'other']).optional(),
  offbudget: z.boolean().optional(),
});

const DeleteAccountSchema = z.object({
  id: z.string().uuid('Account ID must be a valid UUID'),
});

// ----------------------------
// RULE SCHEMAS
// ----------------------------

const UpdateRuleSchema = z
  .object({
    id: z.string().uuid('Rule ID must be a valid UUID'),
  })
  .merge(RuleDataSchema.partial());

const DeleteRuleSchema = z.object({
  id: z.string().uuid('Rule ID must be a valid UUID'),
});

// ----------------------------
// CATEGORY GROUP SCHEMAS
// ----------------------------

const CreateCategoryGroupSchema = z.object({
  name: z.string().min(1, 'Category group name is required'),
});

const UpdateCategoryGroupSchema = z.object({
  id: z.string().uuid('Category group ID must be a valid UUID'),
  name: z.string().min(1).optional(),
});

const DeleteCategoryGroupSchema = z.object({
  id: z.string().uuid('Category group ID must be a valid UUID'),
});

// ----------------------------
// ENTITY CONFIGURATIONS
// ----------------------------

/**
 * CRUD configurations for all entity types
 * 
 * This object contains configurations for generating CRUD tools for each entity type
 * in the Actual Budget MCP server. Each configuration includes:
 * - Entity metadata (name, display name, handler class)
 * - Create operation (schema, description, permissions)
 * - Update operation (schema, description, permissions)
 * - Delete operation (schema, description, permissions)
 * 
 * The factory uses these configurations to generate tool definitions that are
 * registered with the MCP server and exposed to LLMs.
 * 
 * @example Using entity configurations
 * ```typescript
 * import { createCRUDTools } from './crud-factory.js';
 * import { entityConfigurations } from './crud-factory-config.js';
 * 
 * // Generate tools for all entities
 * const categoryTools = createCRUDTools(entityConfigurations.category);
 * const payeeTools = createCRUDTools(entityConfigurations.payee);
 * const accountTools = createCRUDTools(entityConfigurations.account);
 * 
 * // Add to tool registry
 * const toolRegistry = [
 *   ...categoryTools,
 *   ...payeeTools,
 *   ...accountTools,
 *   // ... other tools
 * ];
 * ```
 * 
 * @see {@link EntityCRUDConfig} for configuration structure
 * @see {@link createCRUDTools} for tool generation
 */
export const entityConfigurations = {
  /**
   * Category entity configuration
   * 
   * Generates tools: create-category, update-category, delete-category
   * 
   * Categories are used to organize budget transactions into spending groups.
   * Each category belongs to a category group and can have a monthly budget amount.
   */
  category: {
    // Entity name used as tool name prefix (e.g., "category" → "create-category")
    entityName: 'category',
    // Display name used in success/error messages
    displayName: 'category',
    // Handler class that implements create/update/delete operations
    handlerClass: CategoryHandler,
    // CREATE operation configuration
    create: {
      // Zod schema for input validation - converted to JSON Schema for MCP
      schema: CreateCategorySchema,
      // LLM-friendly description with examples and use cases
      description:
        'Create a new category in Actual Budget.\n\n' +
        'REQUIRED:\n' +
        '- name: Category name\n' +
        '- groupId: Category group ID (UUID)\n\n' +
        'EXAMPLES:\n' +
        '- {"name": "Groceries", "groupId": "group-id"}\n' +
        '- {"name": "Gas", "groupId": "group-id"}\n\n' +
        'COMMON USE CASES:\n' +
        '- Add new spending categories\n' +
        '- Create income categories\n' +
        '- Organize budget by category\n\n' +
        'SEE ALSO:\n' +
        '- Use get-grouped-categories to find group IDs\n' +
        '- Use update-category to modify categories\n' +
        '- Use delete-category to remove categories\n\n' +
        'NOTES:\n' +
        '- Group ID must be a valid UUID\n' +
        '- Use get-grouped-categories to find available group IDs',
      // Requires write permission - checked by tool registry
      requiresWrite: true,
      // Feature flag category - 'core' tools are always available
      category: 'core' as const,
    },
    // UPDATE operation configuration
    update: {
      schema: UpdateCategorySchema,
      description:
        'Update an existing category in Actual Budget.\n\n' +
        'REQUIRED:\n' +
        '- id: Category ID (UUID)\n\n' +
        'OPTIONAL (at least one required):\n' +
        '- name: New category name\n' +
        '- groupId: New category group ID\n\n' +
        'EXAMPLES:\n' +
        '- Rename: {"id": "category-id", "name": "New Name"}\n' +
        '- Move group: {"id": "category-id", "groupId": "new-group-id"}\n' +
        '- Both: {"id": "category-id", "name": "New Name", "groupId": "new-group-id"}\n\n' +
        'COMMON USE CASES:\n' +
        '- Rename categories\n' +
        '- Move categories between groups\n' +
        '- Correct category information\n\n' +
        'SEE ALSO:\n' +
        '- Use get-grouped-categories to find category IDs\n' +
        '- Use create-category to add new categories\n' +
        '- Use delete-category to remove categories\n\n' +
        'NOTES:\n' +
        '- Only provided fields will be updated',
      requiresWrite: true,
      category: 'core' as const,
    },
    // DELETE operation configuration
    delete: {
      schema: DeleteCategorySchema,
      description:
        'Delete a category from Actual Budget.\n\n' +
        'REQUIRED:\n' +
        '- id: Category ID (UUID)\n\n' +
        'EXAMPLE:\n' +
        '{"id": "category-id"}\n\n' +
        'COMMON USE CASES:\n' +
        '- Remove unused categories\n' +
        '- Clean up test categories\n' +
        '- Consolidate duplicate categories\n\n' +
        'SEE ALSO:\n' +
        '- Use get-grouped-categories to find category IDs\n' +
        '- Use create-category to add new categories\n' +
        '- Use update-category to modify categories\n\n' +
        'NOTES:\n' +
        '- ⚠️ WARNING: Deletion is permanent and cannot be undone\n' +
        '- Transactions using this category may need to be recategorized',
      requiresWrite: true,
      category: 'core' as const,
    },
  } satisfies EntityCRUDConfig<typeof CreateCategorySchema, typeof UpdateCategorySchema, typeof DeleteCategorySchema, CategoryHandler>,

  payee: {
    entityName: 'payee',
    displayName: 'payee',
    handlerClass: PayeeHandler,
    create: {
      schema: CreatePayeeSchema,
      description:
        'Create a new payee in Actual Budget.\n\n' +
        'REQUIRED:\n' +
        '- name: Payee name\n\n' +
        'OPTIONAL:\n' +
        '- transferAccount: Account ID for transfer payees\n\n' +
        'EXAMPLES:\n' +
        '- Regular payee: {"name": "Whole Foods"}\n' +
        '- Transfer payee: {"name": "Transfer to Savings", "transferAccount": "savings-account-id"}\n\n' +
        'COMMON USE CASES:\n' +
        '- Add new merchants/vendors\n' +
        '- Create transfer payees\n' +
        '- Standardize payee names\n\n' +
        'SEE ALSO:\n' +
        '- Use get-payees to list all payees\n' +
        '- Use update-payee to modify payees\n' +
        '- Use delete-payee to remove payees\n' +
        '- Use merge-payees to consolidate duplicate payees\n\n' +
        'NOTES:\n' +
        '- Transfer payees are used for account-to-account transfers\n' +
        '- Regular payees represent merchants or vendors',
      requiresWrite: true,
      category: 'core' as const,
    },
    update: {
      schema: UpdatePayeeSchema,
      description:
        'Update an existing payee in Actual Budget.\n\n' +
        'REQUIRED:\n' +
        '- id: Payee ID (UUID)\n\n' +
        'OPTIONAL (at least one required):\n' +
        '- name: New payee name\n' +
        '- transferAccount: New transfer account ID\n\n' +
        'EXAMPLES:\n' +
        '- Rename: {"id": "payee-id", "name": "Updated Name"}\n' +
        '- Update transfer: {"id": "payee-id", "transferAccount": "new-account-id"}\n' +
        '- Both: {"id": "payee-id", "name": "New Name", "transferAccount": "account-id"}\n\n' +
        'COMMON USE CASES:\n' +
        '- Rename payees\n' +
        '- Update transfer account\n' +
        '- Correct payee information\n\n' +
        'SEE ALSO:\n' +
        '- Use get-payees to find payee IDs\n' +
        '- Use create-payee to add new payees\n' +
        '- Use delete-payee to remove payees\n' +
        '- Use merge-payees to consolidate duplicates\n\n' +
        'NOTES:\n' +
        '- Only provided fields will be updated',
      requiresWrite: true,
      category: 'core' as const,
    },
    delete: {
      schema: DeletePayeeSchema,
      description:
        'Delete a payee from Actual Budget.\n\n' +
        'REQUIRED:\n' +
        '- id: Payee ID (UUID)\n\n' +
        'EXAMPLE:\n' +
        '{"id": "payee-id"}\n\n' +
        'COMMON USE CASES:\n' +
        '- Remove unused payees\n' +
        '- Clean up test payees\n' +
        '- Delete duplicate payees (consider merge-payees instead)\n\n' +
        'SEE ALSO:\n' +
        '- Use get-payees to find payee IDs\n' +
        '- Use create-payee to add new payees\n' +
        '- Use update-payee to modify payees\n' +
        '- Use merge-payees to consolidate duplicates instead of deleting\n\n' +
        'NOTES:\n' +
        '- ⚠️ WARNING: Deletion is permanent and cannot be undone\n' +
        '- Consider using merge-payees to consolidate duplicates instead',
      requiresWrite: true,
      category: 'core' as const,
    },
  } satisfies EntityCRUDConfig<typeof CreatePayeeSchema, typeof UpdatePayeeSchema, typeof DeletePayeeSchema, PayeeHandler>,

  account: {
    entityName: 'account',
    displayName: 'account',
    handlerClass: AccountHandler,
    create: {
      schema: CreateAccountSchema,
      description:
        'Add a new account to the budget. Use this when the user wants to set up a new bank account, credit card, or investment account.\n\n' +
        'WHEN TO USE:\n' +
        '- User says "add a new checking account"\n' +
        '- User wants to "create an account for [bank name]"\n' +
        '- User says "set up my credit card"\n' +
        '- User wants to "add a savings account"\n' +
        '- User needs to track a new financial account\n\n' +
        'REQUIRED:\n' +
        '- name: Account name (e.g., "Chase Checking")\n' +
        '- type: checking, savings, credit, investment, mortgage, debt, or other\n\n' +
        'OPTIONAL:\n' +
        '- offbudget: Set true for tracking-only accounts (default: false)\n' +
        '- initialBalance: Starting balance in cents (default: 0)\n\n' +
        'EXAMPLES:\n' +
        '- "Add checking account": {"name": "Chase Checking", "type": "checking"}\n' +
        '- "Create savings with $10k": {"name": "High Yield Savings", "type": "savings", "initialBalance": 1000000}\n' +
        '- "Add credit card": {"name": "Amazon Card", "type": "credit"}\n' +
        '- "Track 401k off-budget": {"name": "401k", "type": "investment", "offbudget": true}\n\n' +
        'NOTES:\n' +
        '- Initial balance in cents (100000 = $1,000)\n' +
        '- Off-budget accounts don\'t affect budget calculations',
      requiresWrite: true,
      category: 'nini' as const,
    },
    update: {
      schema: UpdateAccountSchema,
      description:
        'Modify account properties like name, type, or budget status. Use this when the user wants to change account details.\n\n' +
        'WHEN TO USE:\n' +
        '- User says "rename my checking account"\n' +
        '- User wants to "change account type"\n' +
        '- User says "move account off-budget" or "make it on-budget"\n' +
        '- User needs to "update account information"\n\n' +
        'REQUIRED:\n' +
        '- id: Account ID (get from get-accounts first)\n' +
        '- At least one field to update\n\n' +
        'OPTIONAL:\n' +
        '- name: New account name\n' +
        '- type: checking, savings, credit, investment, mortgage, debt, or other\n' +
        '- offbudget: true/false\n\n' +
        'EXAMPLES:\n' +
        '- "Rename account": {"id": "abc-123", "name": "New Name"}\n' +
        '- "Change to savings": {"id": "abc-123", "type": "savings"}\n' +
        '- "Move off-budget": {"id": "abc-123", "offbudget": true}\n\n' +
        'NOTES: Use get-accounts to find the account ID first',
      requiresWrite: true,
      category: 'core' as const,
    },
    delete: {
      schema: DeleteAccountSchema,
      description:
        'Permanently remove an account. Use this when the user wants to delete a test or duplicate account.\n\n' +
        'WHEN TO USE:\n' +
        '- User says "delete that account"\n' +
        '- User wants to "remove test account"\n' +
        '- User needs to "clean up duplicate accounts"\n' +
        '- User says "get rid of [account]"\n\n' +
        'REQUIRED:\n' +
        '- id: Account ID (get from get-accounts first)\n\n' +
        'EXAMPLE:\n' +
        '- "Delete account": {"id": "abc-123"}\n\n' +
        'NOTES:\n' +
        '- ⚠️ PERMANENT: Cannot be undone\n' +
        '- Consider close-account instead to keep transaction history\n' +
        '- Use get-accounts to find the account ID first',
      requiresWrite: true,
      category: 'nini' as const,
    },
  } satisfies EntityCRUDConfig<typeof CreateAccountSchema, typeof UpdateAccountSchema, typeof DeleteAccountSchema, AccountHandler>,

  rule: {
    entityName: 'rule',
    displayName: 'rule',
    handlerClass: RuleHandler,
    create: {
      schema: RuleDataSchema,
      description:
        'Create a new auto-categorization rule in Actual Budget.\n\n' +
        'REQUIRED:\n' +
        '- conditionsOp: How to combine conditions ("and" or "or")\n' +
        '- conditions: Array of rule conditions (at least one required)\n' +
        '- actions: Array of rule actions (at least one required)\n\n' +
        'OPTIONAL:\n' +
        '- stage: Rule stage ("pre" or "post", default: null)\n\n' +
        'CONDITION FIELDS:\n' +
        '- field: account, category, date, payee, amount, imported_payee\n' +
        '- op: is, isNot, oneOf, notOneOf, contains, etc.\n' +
        '- value: string, number, or array\n\n' +
        'ACTION FIELDS:\n' +
        '- field: account, category, date, payee, amount, cleared, notes, or null\n' +
        '- op: set, prepend-notes, append-notes, set-split-amount\n' +
        '- value: boolean, string, number, or null\n\n' +
        'EXAMPLES:\n' +
        '- Auto-categorize by payee: {"conditionsOp": "and", "conditions": [{"field": "payee", "op": "is", "value": "payee-id"}], "actions": [{"field": "category", "op": "set", "value": "category-id"}]}\n' +
        '- Multiple conditions: {"conditionsOp": "or", "conditions": [{"field": "payee", "op": "contains", "value": "Amazon"}, {"field": "payee", "op": "contains", "value": "AWS"}], "actions": [{"field": "category", "op": "set", "value": "category-id"}]}\n\n' +
        'COMMON USE CASES:\n' +
        '- Auto-categorize transactions by payee\n' +
        '- Set default categories for accounts\n' +
        '- Add notes to transactions\n' +
        '- Automate transaction processing\n\n' +
        'SEE ALSO:\n' +
        '- Use get-rules to list all rules\n' +
        '- Use update-rule to modify rules\n' +
        '- Use delete-rule to remove rules\n\n' +
        'NOTES:\n' +
        '- Rules are processed in order (pre-stage then post-stage)\n' +
        '- Conditions are combined using conditionsOp (and/or)\n' +
        '- Actions are executed when all conditions match',
      requiresWrite: true,
      category: 'core' as const,
    },
    update: {
      schema: UpdateRuleSchema,
      description:
        'Update an existing auto-categorization rule in Actual Budget.\n\n' +
        'REQUIRED:\n' +
        '- id: Rule ID (UUID)\n\n' +
        'OPTIONAL (at least one required):\n' +
        '- stage: Rule stage ("pre" or "post")\n' +
        '- conditionsOp: How to combine conditions ("and" or "or")\n' +
        '- conditions: Array of rule conditions\n' +
        '- actions: Array of rule actions\n\n' +
        'EXAMPLES:\n' +
        '- Update conditions: {"id": "rule-id", "conditions": [{"field": "payee", "op": "is", "value": "new-payee-id"}]}\n' +
        '- Update actions: {"id": "rule-id", "actions": [{"field": "category", "op": "set", "value": "new-category-id"}]}\n' +
        '- Change stage: {"id": "rule-id", "stage": "post"}\n\n' +
        'COMMON USE CASES:\n' +
        '- Modify rule conditions\n' +
        '- Update rule actions\n' +
        '- Change rule processing stage\n' +
        '- Fix incorrect rules\n\n' +
        'SEE ALSO:\n' +
        '- Use get-rules to find rule IDs\n' +
        '- Use create-rule to add new rules\n' +
        '- Use delete-rule to remove rules\n\n' +
        'NOTES:\n' +
        '- Only provided fields will be updated\n' +
        '- See create-rule for condition and action structure',
      requiresWrite: true,
      category: 'core' as const,
    },
    delete: {
      schema: DeleteRuleSchema,
      description:
        'Delete an auto-categorization rule from Actual Budget.\n\n' +
        'REQUIRED:\n' +
        '- id: Rule ID (UUID)\n\n' +
        'EXAMPLE:\n' +
        '{"id": "rule-id"}\n\n' +
        'COMMON USE CASES:\n' +
        '- Remove unused rules\n' +
        '- Clean up test rules\n' +
        '- Delete incorrect rules\n\n' +
        'SEE ALSO:\n' +
        '- Use get-rules to find rule IDs\n' +
        '- Use create-rule to add new rules\n' +
        '- Use update-rule to modify rules\n\n' +
        'NOTES:\n' +
        '- ⚠️ WARNING: Deletion is permanent and cannot be undone',
      requiresWrite: true,
      category: 'core' as const,
    },
  } satisfies EntityCRUDConfig<typeof RuleDataSchema, typeof UpdateRuleSchema, typeof DeleteRuleSchema, RuleHandler>,

  categoryGroup: {
    entityName: 'category-group',
    displayName: 'category group',
    handlerClass: CategoryGroupHandler,
    create: {
      schema: CreateCategoryGroupSchema,
      description:
        'Create a new category group in Actual Budget.\n\n' +
        'REQUIRED:\n' +
        '- name: Category group name\n\n' +
        'EXAMPLES:\n' +
        '- {"name": "Food & Dining"}\n' +
        '- {"name": "Transportation"}\n' +
        '- {"name": "Entertainment"}\n\n' +
        'COMMON USE CASES:\n' +
        '- Organize categories into groups\n' +
        '- Create new budget sections\n' +
        '- Group related spending categories\n\n' +
        'SEE ALSO:\n' +
        '- Use get-grouped-categories to list all groups\n' +
        '- Use update-category-group to modify groups\n' +
        '- Use delete-category-group to remove groups\n' +
        '- Use create-category to add categories to groups\n\n' +
        'NOTES:\n' +
        '- Category groups help organize your budget\n' +
        '- Categories must belong to a group',
      requiresWrite: true,
      category: 'core' as const,
    },
    update: {
      schema: UpdateCategoryGroupSchema,
      description:
        'Update an existing category group in Actual Budget.\n\n' +
        'REQUIRED:\n' +
        '- id: Category group ID (UUID)\n\n' +
        'OPTIONAL:\n' +
        '- name: New category group name\n\n' +
        'EXAMPLES:\n' +
        '- {"id": "group-id", "name": "Updated Group Name"}\n\n' +
        'COMMON USE CASES:\n' +
        '- Rename category groups\n' +
        '- Correct group names\n' +
        '- Reorganize budget structure\n\n' +
        'SEE ALSO:\n' +
        '- Use get-grouped-categories to find group IDs\n' +
        '- Use create-category-group to add new groups\n' +
        '- Use delete-category-group to remove groups\n\n' +
        'NOTES:\n' +
        '- Only provided fields will be updated',
      requiresWrite: true,
      category: 'core' as const,
    },
    delete: {
      schema: DeleteCategoryGroupSchema,
      description:
        'Delete a category group from Actual Budget.\n\n' +
        'REQUIRED:\n' +
        '- id: Category group ID (UUID)\n\n' +
        'EXAMPLE:\n' +
        '{"id": "group-id"}\n\n' +
        'COMMON USE CASES:\n' +
        '- Remove unused category groups\n' +
        '- Clean up test groups\n' +
        '- Consolidate groups\n\n' +
        'SEE ALSO:\n' +
        '- Use get-grouped-categories to find group IDs\n' +
        '- Use create-category-group to add new groups\n' +
        '- Use update-category-group to modify groups\n\n' +
        'NOTES:\n' +
        '- ⚠️ WARNING: Deletion is permanent and cannot be undone\n' +
        '- Categories in this group may need to be moved first',
      requiresWrite: true,
      category: 'core' as const,
    },
  } satisfies EntityCRUDConfig<typeof CreateCategoryGroupSchema, typeof UpdateCategoryGroupSchema, typeof DeleteCategoryGroupSchema, CategoryGroupHandler>,
};
