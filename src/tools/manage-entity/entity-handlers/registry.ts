// ----------------------------
// ENTITY HANDLER REGISTRY
// ----------------------------

import type { EntityHandler } from './base-handler.js';
import type { EntityType } from '../types.js';
import { CategoryHandler } from './category-handler.js';
import { CategoryGroupHandler } from './category-group-handler.js';
import { PayeeHandler } from './payee-handler.js';
import { RuleHandler } from './rule-handler.js';
import { ScheduleHandler } from './schedule-handler.js';

/**
 * Registry of entity handlers
 * Maps entity types to their corresponding handler instances
 * Handlers are singletons to avoid unnecessary instantiation
 */
const entityHandlers: Record<EntityType, EntityHandler> = {
  category: new CategoryHandler(),
  categoryGroup: new CategoryGroupHandler(),
  payee: new PayeeHandler(),
  rule: new RuleHandler(),
  schedule: new ScheduleHandler(),
};

/**
 * Get the appropriate entity handler for a given entity type
 * Provides type-safe access to entity-specific handlers
 *
 * @param entityType - The type of entity to get a handler for
 * @returns The entity handler instance
 *
 * @example
 * ```typescript
 * const handler = getEntityHandler('category');
 * const categoryId = await handler.create({ name: 'Groceries', groupId: 'group-123' });
 * ```
 */
export function getEntityHandler(entityType: EntityType): EntityHandler {
  const handler = entityHandlers[entityType];

  if (!handler) {
    throw new Error(`No handler registered for entity type: ${entityType}`);
  }

  return handler;
}

/**
 * Check if an entity type has a registered handler
 *
 * @param entityType - The entity type to check
 * @returns True if a handler is registered, false otherwise
 */
export function hasEntityHandler(entityType: string): entityType is EntityType {
  return entityType in entityHandlers;
}

/**
 * Get all registered entity types
 *
 * @returns Array of all registered entity types
 */
export function getRegisteredEntityTypes(): EntityType[] {
  return Object.keys(entityHandlers) as EntityType[];
}
