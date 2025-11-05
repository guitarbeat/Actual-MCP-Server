// ----------------------------
// ENTITY-SPECIFIC ERROR BUILDERS
// ----------------------------

import { MCPResponse } from '../../../core/response/types.js';
import { notFoundError, validationError, apiError } from '../../../core/response/error-builder.js';
import type { Operation } from '../entity-handlers/base-handler.js';

/**
 * Entity types supported by the manage-entity tool
 */
export type EntityType = 'category' | 'categoryGroup' | 'payee' | 'rule' | 'schedule';

/**
 * Entity-specific error builder for manage-entity tool
 * Provides consistent, helpful error messages with entity-specific context
 */
export class EntityErrorBuilder {
  /**
   * Create a not found error for a specific entity type
   * @param entityType - The type of entity that was not found
   * @param id - The ID of the entity that was not found
   * @returns A not found error response with entity-specific suggestions
   */
  static notFound(entityType: EntityType, id: string): MCPResponse {
    const entityName = this.formatEntityName(entityType);
    const listTool = this.getListToolName(entityType);

    return notFoundError(entityName, id, {
      suggestion: `Use the '${listTool}' tool to list available ${entityType}s and verify the ID exists.`,
    });
  }

  /**
   * Create a validation error for entity-specific fields
   * @param entityType - The type of entity being validated
   * @param field - The field that failed validation
   * @param message - The validation error message
   * @returns A validation error response with entity-specific context
   */
  static validationError(entityType: EntityType, field: string, message: string): MCPResponse {
    return validationError(`Invalid ${entityType} ${field}: ${message}`, {
      field,
    });
  }

  /**
   * Create an operation error for entity operations
   * @param entityType - The type of entity
   * @param operation - The operation that failed
   * @param err - The original error
   * @returns An API error response with entity-specific context
   */
  static operationError(entityType: EntityType, operation: Operation, err: unknown): MCPResponse {
    const entityName = this.formatEntityName(entityType);
    const listTool = this.getListToolName(entityType);

    return apiError(`Failed to ${operation} ${entityType}`, err, {
      entityType,
      operation,
      suggestion: `Check that the ${entityName.toLowerCase()} exists using '${listTool}' and you have write permissions enabled.`,
    });
  }

  /**
   * Create an error for missing required operation parameters
   * @param operation - The operation being performed
   * @param missingParam - The missing parameter name
   * @returns A validation error response
   */
  static missingParameter(operation: Operation, missingParam: string): MCPResponse {
    let message = '';
    let suggestion = '';

    if (missingParam === 'id') {
      message = `'id' is required for ${operation} operations`;
      suggestion = 'Provide the entity ID to update or delete. Use listing tools to find valid IDs.';
    } else if (missingParam === 'data') {
      message = `'data' is required for ${operation} operations`;
      suggestion = `Provide the entity data object with required fields for ${operation} operation.`;
    }

    return validationError(message, { field: missingParam, expected: suggestion });
  }

  /**
   * Format entity type name for display (capitalize first letter)
   * @param entityType - The entity type
   * @returns Formatted entity name
   */
  private static formatEntityName(entityType: EntityType): string {
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
  private static getListToolName(entityType: EntityType): string {
    const toolMap: Record<EntityType, string> = {
      category: 'get-grouped-categories',
      categoryGroup: 'get-grouped-categories',
      payee: 'get-payees',
      rule: 'get-rules',
      schedule: 'get-schedules',
    };

    return toolMap[entityType];
  }
}
