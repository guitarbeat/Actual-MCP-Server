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
    'Create, update, or delete entities (categories, category groups, payees, rules, schedules). This consolidated tool replaces individual CRUD tools for better efficiency.',
  inputSchema: {
    type: 'object',
    properties: {
      entityType: {
        type: 'string',
        enum: ['category', 'categoryGroup', 'payee', 'rule', 'schedule'],
        description: 'Type of entity to manage',
      },
      operation: {
        type: 'string',
        enum: ['create', 'update', 'delete'],
        description: 'Operation to perform on the entity',
      },
      id: {
        type: 'string',
        description: 'Entity ID (required for update and delete operations). Must be a valid UUID.',
      },
      data: {
        type: 'object',
        description:
          'Entity-specific data (required for create and update operations). Structure depends on entityType.',
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
