import { createUnifiedCRUDTool } from '../../tools/crud-factory.js';
import { entityConfigurations } from '../../tools/crud-factory-config.js';
import { defineLegacyTool } from './common.js';

/**
 * Unified CRUD tools — one manage-{entity} tool per entity type.
 *
 * Each tool accepts an `action` field ("create", "update", or "delete")
 * and the relevant fields for that operation. This reduces tool count
 * from 18 (3 × 6 entities) to 6, improving LLM tool selection accuracy.
 */
export const crudToolDefinitions = [
  createUnifiedCRUDTool(entityConfigurations.category),
  createUnifiedCRUDTool(entityConfigurations.payee),
  createUnifiedCRUDTool(entityConfigurations.tag),
  createUnifiedCRUDTool(entityConfigurations.account),
  createUnifiedCRUDTool(entityConfigurations.rule),
  createUnifiedCRUDTool(entityConfigurations.categoryGroup),
].map((tool) => defineLegacyTool(tool));
