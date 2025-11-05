import { features } from '../../features.js';
import { z } from 'zod';
import { CategoryHandler } from './entity-handlers/category-handler.js';
import { CategoryGroupHandler } from './entity-handlers/category-group-handler.js';
import { PayeeHandler } from './entity-handlers/payee-handler.js';
import { RuleHandler } from './entity-handlers/rule-handler.js';
import { ScheduleHandler } from './entity-handlers/schedule-handler.js';
import type { EntityHandler } from './entity-handlers/base-handler.js';
import type { EntityType, ManageEntityArgs } from './types.js';
import { EntityErrorBuilder } from './errors/entity-error-builder.js';
import { error as createError, success, MCPResponse } from '../../utils/response.js';

const entityHandlers: Record<EntityType, EntityHandler<any, any>> = {
  category: new CategoryHandler(),
  categoryGroup: new CategoryGroupHandler(),
  payee: new PayeeHandler(),
  rule: new RuleHandler(),
  schedule: new ScheduleHandler(),
};

export const schema = {
  name: 'manage-entity',
  description:
    'Create, update, or delete budget entities: categories, category groups, payees, rules, and schedules.\n\n' +
    'ENTITY TYPES & DATA STRUCTURES:\n\n' +
    '• CATEGORY\n' +
    '  Create/Update data: {name: string, groupId: string}\n' +
    '  - name: Category name (e.g., "Groceries", "Gas")\n' +
    '  - groupId: UUID of the parent category group (use get-grouped-categories to find group IDs)\n' +
    '  Create example: {"entityType": "category", "operation": "create", "data": {"name": "Groceries", "groupId": "550e8400-e29b-41d4-a716-446655440000"}}\n' +
    '  Update example: {"entityType": "category", "operation": "update", "id": "abc123-def456", "data": {"name": "Grocery Shopping", "groupId": "550e8400-e29b-41d4-a716-446655440000"}}\n\n' +
    '• CATEGORY GROUP\n' +
    '  Create/Update data: {name: string}\n' +
    '  - name: Category group name (e.g., "Food & Dining", "Transportation")\n' +
    '  Create example: {"entityType": "categoryGroup", "operation": "create", "data": {"name": "Food & Dining"}}\n' +
    '  Update example: {"entityType": "categoryGroup", "operation": "update", "id": "abc123-def456", "data": {"name": "Food & Beverages"}}\n\n' +
    '• PAYEE\n' +
    '  Create/Update data: {name: string, transferAccount?: string}\n' +
    '  - name: Payee name (e.g., "Whole Foods", "Shell Gas Station")\n' +
    '  - transferAccount: (Optional) UUID of account for transfer payees (use get-accounts to find account IDs)\n' +
    '  Create example: {"entityType": "payee", "operation": "create", "data": {"name": "Whole Foods"}}\n' +
    '  Update example: {"entityType": "payee", "operation": "update", "id": "abc123-def456", "data": {"name": "Whole Foods Market"}}\n' +
    '  Transfer payee example: {"entityType": "payee", "operation": "create", "data": {"name": "Transfer to Savings", "transferAccount": "550e8400-e29b-41d4-a716-446655440000"}}\n\n' +
    '• RULE\n' +
    '  Create/Update data: {conditionsOp: "and"|"or", conditions: array, actions: array, stage?: "pre"|"post"|null}\n' +
    '  - conditionsOp: How to combine conditions ("and" or "or")\n' +
    '  - conditions: Array of condition objects with {field, op, value}\n' +
    '    - field: "account"|"category"|"date"|"payee"|"amount"|"imported_payee"\n' +
    '    - op: "is"|"isNot"|"oneOf"|"contains"|"gt"|"gte"|"lt"|"lte"|"isbetween" (and more)\n' +
    '    - value: string, number, or array depending on operator\n' +
    '  - actions: Array of action objects with {field, op, value}\n' +
    '    - field: "account"|"category"|"date"|"payee"|"amount"|"cleared"|"notes"|null\n' +
    '    - op: "set"|"prepend-notes"|"append-notes"|"set-split-amount"\n' +
    '    - value: The value to set (string, number, boolean, or null)\n' +
    '  - stage: (Optional) When to run the rule: "pre" (before user edits) or "post" (after user edits)\n' +
    '  Create example: {"entityType": "rule", "operation": "create", "data": {"conditionsOp": "and", "conditions": [{"field": "payee", "op": "is", "value": "550e8400-e29b-41d4-a716-446655440000"}], "actions": [{"field": "category", "op": "set", "value": "abc123-def456"}]}}\n' +
    '  Update example: {"entityType": "rule", "operation": "update", "id": "abc123-def456", "data": {"conditionsOp": "or", "conditions": [{"field": "payee", "op": "contains", "value": "Amazon"}], "actions": [{"field": "category", "op": "set", "value": "shopping-category-id"}]}}\n\n' +
    '• SCHEDULE\n' +
    '  Create/Update data: {name: string, accountId: string, amount: number, nextDate: string, rule: string, payee?: string, category?: string, notes?: string}\n' +
    '  - name: Schedule name (e.g., "Monthly Rent", "Weekly Groceries")\n' +
    '  - accountId: UUID of the account (use get-accounts to find account IDs)\n' +
    '  - amount: Amount in cents (e.g., -150000 = -$1,500.00). Negative for expenses, positive for income.\n' +
    '  - nextDate: Next occurrence date in YYYY-MM-DD format\n' +
    '  - rule: Recurrence rule string (e.g., "monthly" for monthly, "weekly" for weekly, "yearly" for yearly)\n' +
    '  - payee: (Optional) Payee name or UUID\n' +
    '  - category: (Optional) Category name or UUID\n' +
    '  - notes: (Optional) Transaction notes\n' +
    '  Create example: {"entityType": "schedule", "operation": "create", "data": {"name": "Monthly Rent", "accountId": "550e8400-e29b-41d4-a716-446655440000", "amount": -150000, "nextDate": "2024-02-01", "rule": "monthly", "payee": "Landlord", "category": "Rent"}}\n' +
    '  Update example: {"entityType": "schedule", "operation": "update", "id": "abc123-def456", "data": {"name": "Monthly Rent Payment", "accountId": "550e8400-e29b-41d4-a716-446655440000", "amount": -160000, "nextDate": "2024-03-01", "rule": "monthly"}}\n\n' +
    'OPERATIONS:\n' +
    '- CREATE: Create a new entity. Requires entityType, operation="create", and data object.\n' +
    '- UPDATE: Modify an existing entity. Requires entityType, operation="update", id (UUID), and data object.\n' +
    '- DELETE: Permanently remove an entity. Requires entityType, operation="delete", and id (UUID). WARNING: Cannot be undone!\n\n' +
    'COMMON USE CASES:\n' +
    '- Creating a new spending category: entityType="category", operation="create", data with name and groupId\n' +
    '- Organizing categories into groups: First create categoryGroup, then create categories with that groupId\n' +
    '- Renaming a payee: entityType="payee", operation="update" with id and new name in data\n' +
    '- Setting up auto-categorization: entityType="rule", operation="create" with conditions (match payee) and actions (set category)\n' +
    '- Scheduling recurring bills: entityType="schedule", operation="create" with name, accountId, amount, nextDate, and rule (frequency)\n' +
    '- Removing outdated rules: entityType="rule", operation="delete" with rule id\n\n' +
    'NOTES:\n' +
    '- Use get-grouped-categories to find category group IDs before creating categories\n' +
    '- Use get-accounts to find account IDs before creating schedules or transfer payees\n' +
    '- For rules, use UUIDs for payee/category values in conditions and actions (not names)\n' +
    '- Amounts are always in cents (multiply dollars by 100)\n' +
    '- Delete operations are permanent and cannot be undone',
  inputSchema: {
    type: 'object',
    properties: {
      entityType: {
        type: 'string',
        enum: ['category', 'categoryGroup', 'payee', 'rule', 'schedule'],
        description:
          'Type of entity to manage. Each type has different data structure requirements. See description for entity-specific data structures and examples.',
      },
      operation: {
        type: 'string',
        enum: ['create', 'update', 'delete'],
        description:
          'Operation to perform. CREATE and UPDATE require data object. UPDATE and DELETE require id. DELETE is permanent and cannot be undone.',
      },
      id: {
        type: 'string',
        description:
          'Entity ID (required for update and delete operations). Must be a valid UUID. Use get-grouped-categories, get-accounts, get-payees, get-rules, or get-schedules to find entity IDs.',
      },
      data: {
        type: 'object',
        description:
          'Entity-specific data (required for create and update operations). Structure depends on entityType:\n' +
          '- category: {name: string, groupId: string}\n' +
          '- categoryGroup: {name: string}\n' +
          '- payee: {name: string, transferAccount?: string}\n' +
          '- rule: {conditionsOp: "and"|"or", conditions: array, actions: array, stage?: "pre"|"post"|null}\n' +
          '- schedule: {name: string, accountId: string, amount: number, nextDate: string, rule: string, payee?: string, category?: string, notes?: string}\n' +
          'See main description for detailed examples and field explanations.',
      },
    },
    required: ['entityType', 'operation'],
  },
};

export async function handler(args: ManageEntityArgs): Promise<MCPResponse> {
  if (!features.manageEntityTool) {
    return createError(
      'The manage-entity tool is not enabled.',
      'This tool is currently under development and not yet available.'
    );
  }

  try {
    const { entityType, operation, id, data } = args;
    const handler = entityHandlers[entityType];

    handler.validate(operation, id, data);

    switch (operation) {
      case 'create': {
        const newId = await handler.create(data);
        handler.invalidateCache();
        return success(`Successfully created ${entityType} with id ${newId}`);
      }
      case 'update': {
        await handler.update(id!, data);
        handler.invalidateCache();
        return success(`Successfully updated ${entityType} with id ${id}`);
      }
      case 'delete': {
        await handler.delete(id!);
        handler.invalidateCache();
        return success(`Successfully deleted ${entityType} with id ${id}`);
      }
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return EntityErrorBuilder.validationError(args.entityType, 'data', error.message);
    }
    if (error.isError) {
      return error;
    }
    return EntityErrorBuilder.operationError(args.entityType, args.operation, error);
  }
}
