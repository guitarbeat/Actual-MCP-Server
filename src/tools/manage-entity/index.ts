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
    'ENTITY TYPES:\n\n' +
    '• category: Spending/income category\n' +
    '  Required: name, groupId\n' +
    '  Example: {"entityType": "category", "operation": "create", "data": {"name": "Groceries", "groupId": "group-id"}}\n\n' +
    '• categoryGroup: Container for categories\n' +
    '  Required: name\n' +
    '  Example: {"entityType": "categoryGroup", "operation": "create", "data": {"name": "Food & Dining"}}\n\n' +
    '• payee: Merchant/vendor name\n' +
    '  Required: name\n' +
    '  Optional: transferAccount (for transfer payees)\n' +
    '  Example: {"entityType": "payee", "operation": "create", "data": {"name": "Whole Foods"}}\n\n' +
    '• rule: Auto-categorization rule\n' +
    '  Required: conditionsOp ("and" or "or"), conditions (array), actions (array)\n' +
    '  Optional: stage\n' +
    '  Example: {"entityType": "rule", "operation": "create", "data": {"conditionsOp": "and", "conditions": [{"field": "payee", "op": "is", "value": "payee-id"}], "actions": [{"field": "category", "op": "set", "value": "category-id"}]}}\n\n' +
    '• schedule: Recurring transaction schedule\n' +
    '  Required: date (YYYY-MM-DD string or RecurConfig object)\n' +
    '  Optional: name, account/accountId, amount (cents), amountOp, payee, category, notes, posts_transaction\n' +
    '  Simple date: {"entityType": "schedule", "operation": "create", "data": {"name": "Monthly Rent", "accountId": "acc-id", "amount": -150000, "date": "2024-02-01"}}\n' +
    '  Recurring: {"entityType": "schedule", "operation": "create", "data": {"name": "Monthly Rent", "accountId": "acc-id", "amount": -150000, "date": {"frequency": "monthly", "start": "2024-02-01", "endMode": "never"}}}\n\n' +
    'OPERATIONS:\n' +
    '- create: Requires entityType, data\n' +
    '- update: Requires entityType, id (UUID), data\n' +
    '- delete: Requires entityType, id (UUID) - permanent\n\n' +
    'COMMON USE CASES:\n' +
    '- Create new spending categories or category groups\n' +
    '- Add new payees for transactions\n' +
    '- Set up auto-categorization rules\n' +
    '- Create recurring transaction schedules\n' +
    '- Organize budget structure\n' +
    '- Update entity names or properties\n' +
    '- Remove unused categories, payees, or rules\n\n' +
    'SEE ALSO:\n' +
    '- Use get-grouped-categories to find category/group IDs before creating categories\n' +
    '- Use get-accounts to find account IDs for schedules\n' +
    '- Use get-payees to find payee IDs for rules or schedules\n' +
    '- Use get-rules to view existing rules before creating new ones\n' +
    '- Use get-schedules to view existing schedules before creating new ones\n\n' +
    'NOTES:\n' +
    '- Use get-grouped-categories to find group IDs\n' +
    '- Use get-accounts to find account IDs\n' +
    '- Schedule date field: Use YYYY-MM-DD string for single occurrence, or RecurConfig object for recurring schedules\n' +
    '- Schedule amount: Use integer (cents) or object {num1, num2} for isbetween amountOp\n' +
    '- Schedule amountOp: "is" (exact), "isapprox" (approximate), or "isbetween" (range)\n' +
    '- Do NOT provide rule, nextDate, or completed fields for schedules (auto-managed by API)\n' +
    '- Delete operations are permanent and cannot be undone',
  inputSchema: {
    type: 'object',
    properties: {
      entityType: {
        type: 'string',
        enum: ['category', 'categoryGroup', 'payee', 'rule', 'schedule'],
        description:
          'Type of entity to manage. Available types: "category" (spending/income categories), "categoryGroup" (category containers), "payee" (merchants/vendors), "rule" (auto-categorization rules), "schedule" (recurring transactions). Each type has different data structure requirements. See description for entity-specific data structures and examples.',
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
          '- category: Required fields are name and groupId\n' +
          '- categoryGroup: Required field is name\n' +
          '- payee: Required field is name, optional field is transferAccount\n' +
          '- rule: Required fields are conditionsOp, conditions, and actions; optional field is stage\n' +
          '- schedule: Required field is date (string or RecurConfig). Optional: name, account/accountId, amount, amountOp, payee, category, notes, posts_transaction\n' +
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
