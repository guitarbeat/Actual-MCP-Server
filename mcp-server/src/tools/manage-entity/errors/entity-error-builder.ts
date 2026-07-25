// ----------------------------
// ENTITY-SPECIFIC ERROR BUILDERS
// ----------------------------

import {
  apiError,
  notFoundError,
  unsupportedFeatureError,
  validationError,
} from '../../../core/response/error-builder.js';
import type { MCPResponse } from '../../../core/response/types.js';
import type { Operation } from '../entity-handlers/base-handler.js';

/**
 * Entity types supported by the manage-entity tool
 */
export type EntityType =
  | 'category'
  | 'categoryGroup'
  | 'payee'
  | 'rule'
  | 'schedule'
  | 'transaction'
  | 'account';

/**
 * Entity-specific error builder for manage-entity tool
 * Provides consistent, helpful error messages with entity-specific context
 */
/**
 * Format entity type name for display (capitalize first letter)
 * @param entityType - The entity type
 * @returns Formatted entity name
 */
function formatEntityName(entityType: EntityType): string {
  if (entityType === 'categoryGroup') {
    return 'Category Group';
  }
  return entityType.charAt(0).toUpperCase() + entityType.slice(1);
}

/**
 * Get the appropriate listing tool name for an entity type
 * @param entityType - The entity type
 * @returns The tool name for listing entities of this type
 */
function getListToolName(entityType: EntityType): string {
  const toolMap: Record<EntityType, string> = {
    category: 'get-grouped-categories',
    categoryGroup: 'get-grouped-categories',
    payee: 'get-payees',
    rule: 'get-rules',
    schedule: 'get-schedules',
    transaction: 'get-transactions',
    account: 'get-accounts',
  };

  return toolMap[entityType];
}

/**
 * Format operation name for display (capitalize and append -ing)
 * @param operation - The operation
 * @returns Formatted operation name
 */
function formatOperation(operation: Operation): string {
  switch (operation) {
    case 'create':
      return 'Creating';
    case 'update':
      return 'Updating';
    case 'delete':
      return 'Deleting';
    case 'close':
      return 'Closing';
    case 'reopen':
      return 'Reopening';
    case 'balance':
      return 'Querying balance for';
  }
}

/**
 * Entity-specific error builder for manage-entity tool
 * Provides consistent, helpful error messages with entity-specific context
 */
export const EntityErrorBuilder = {
  /**
   * Create a not found error for a specific entity type
   * @param entityType - The type of entity that was not found
   * @param id - The ID of the entity that was not found
   * @returns A not found error response with entity-specific suggestions
   */
  notFound(entityType: EntityType, id: string): MCPResponse {
    const entityName = formatEntityName(entityType);
    const listTool = getListToolName(entityType);

    return notFoundError(entityName, id, {
      suggestion: `Use the '${listTool}' tool to list available ${entityType}s and verify the ID exists.`,
    });
  },

  /**
   * Create a validation error for entity-specific fields
   * @param entityType - The type of entity being validated
   * @param field - The field that failed validation
   * @param message - The validation error message
   * @returns A validation error response with entity-specific context
   */
  validationError(entityType: EntityType, field: string, message: string): MCPResponse {
    return validationError(`Invalid ${entityType} ${field}: ${message}`, {
      field,
    });
  },

  /**
   * Create an operation error for entity operations
   * @param entityType - The type of entity
   * @param operation - The operation that failed
   * @param err - The original error
   * @returns An API error response with entity-specific context
   */
  operationError(entityType: EntityType, operation: Operation, err: unknown): MCPResponse {
    const entityName = formatEntityName(entityType);
    const listTool = getListToolName(entityType);

    return apiError(`Failed to ${operation} ${entityType}`, err, {
      entityType,
      operation,
      suggestion: `Check that the ${entityName.toLowerCase()} exists using '${listTool}' and you have write permissions enabled.`,
    });
  },

  /**
   * Create an unsupported feature error for the given entity type and operation
   * @param entityType - The entity type (e.g., 'schedule')
   * @param operation - Optional operation that triggered the unsupported error
   * @returns An unsupported feature error response with upgrade guidance
   */
  unsupportedFeature(entityType: EntityType, operation?: Operation): MCPResponse {
    const entityName = formatEntityName(entityType);
    const featureDescription = operation
      ? `${formatOperation(operation)} ${entityName.toLowerCase()}`
      : `${entityName} operations`;

    const suggestion =
      entityType === 'schedule'
        ? 'Upgrade your Actual Budget server to a version that exposes schedule APIs or manage schedules directly in the Actual app.'
        : 'Upgrade your Actual Budget server to a version that exposes this capability or manage it directly in the Actual app.';

    return unsupportedFeatureError(featureDescription, { suggestion });
  },

  /**
   * Create an error for missing required operation parameters
   * @param operation - The operation being performed
   * @param missingParam - The missing parameter name
   * @returns A validation error response
   */
  missingParameter(operation: Operation, missingParam: string): MCPResponse {
    let message = '';
    let suggestion = '';

    if (missingParam === 'id') {
      message = `'id' is required for ${operation} operations`;
      suggestion =
        'Provide the entity ID to update or delete. Use listing tools to find valid IDs.';
    } else if (missingParam === 'data') {
      message = `'data' is required for ${operation} operations`;
      suggestion = `Provide the entity data object with required fields for ${operation} operation.`;
    }

    return validationError(message, {
      field: missingParam,
      expected: suggestion,
    });
  },
};
