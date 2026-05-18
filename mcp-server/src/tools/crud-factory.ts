// ----------------------------
// CRUD FACTORY
// Generic factory for generating CRUD tool definitions from entity configurations
// ----------------------------

import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { error, errorFromCatch, success } from '../core/response/index.js';
import type { MCPResponse, ToolInput } from '../core/types/index.js';
import type { EntityHandler } from './manage-entity/entity-handlers/base-handler.js';

/**
 * Tool category for feature flag filtering
 */
type ToolCategory = 'core' | 'advanced';

/**
 * Extended tool definition with category for feature flag filtering
 */
export interface CategorizedToolDefinition {
  schema: {
    name: string;
    description?: string;
    inputSchema: ToolInput;
  };
  handler: (args: Record<string, unknown>) => Promise<MCPResponse>;
  requiresWrite: boolean;
  category: ToolCategory;
}

/**
 * Configuration for a single CRUD operation (create, update, or delete)
 *
 * This interface defines the metadata needed to generate a single tool definition.
 * Each operation (create, update, delete) requires its own configuration.
 *
 * @template TSchema - Zod schema type for input validation
 *
 * @example
 * ```typescript
 * const createConfig: CRUDOperationConfig<typeof CreateCategorySchema> = {
 *   schema: CreateCategorySchema,
 *   description: 'Create a new category in Actual Budget...',
 *   requiresWrite: true,
 *   category: 'core',
 * };
 * ```
 */
export interface CRUDOperationConfig<TSchema extends z.ZodType> {
  /** Zod schema for input validation - converted to JSON Schema for MCP */
  schema: TSchema;
  /** Tool description for LLMs - should include examples and use cases */
  description: string;
  /** Whether this operation requires write permission - checked by tool registry */
  requiresWrite: boolean;
  /** Tool category (core or advanced) - used for feature flag filtering */
  category: ToolCategory;
}

/**
 * Complete configuration for an entity's CRUD tools
 *
 * This interface defines all metadata needed to generate a complete set of
 * CRUD tools (create, update, delete) for a single entity type.
 *
 * @template TCreateSchema - Zod schema type for create operation
 * @template TUpdateSchema - Zod schema type for update operation
 * @template TDeleteSchema - Zod schema type for delete operation
 * @template THandler - Entity handler class type
 *
 * @example
 * ```typescript
 * const categoryConfig: EntityCRUDConfig<
 *   typeof CreateCategorySchema,
 *   typeof UpdateCategorySchema,
 *   typeof DeleteCategorySchema,
 *   CategoryHandler
 * > = {
 *   entityName: 'category',
 *   displayName: 'category',
 *   handlerClass: CategoryHandler,
 *   create: { schema: CreateCategorySchema, description: '...', requiresWrite: true, category: 'core' },
 *   update: { schema: UpdateCategorySchema, description: '...', requiresWrite: true, category: 'core' },
 *   delete: { schema: DeleteCategorySchema, description: '...', requiresWrite: true, category: 'core' },
 * };
 * ```
 */
export interface EntityCRUDConfig<
  TCreateSchema extends z.ZodType,
  TUpdateSchema extends z.ZodType,
  TDeleteSchema extends z.ZodType,
  THandler extends EntityHandler,
> {
  /** Entity name used as tool name prefix (e.g., "category" → "create-category") */
  entityName: string;
  /** Display name for success/error messages (e.g., "category", "payee") */
  displayName: string;
  /** Entity handler class constructor - instantiated for each operation */
  handlerClass: new () => THandler;
  /** Configuration for create operation - generates "create-{entityName}" tool */
  create: CRUDOperationConfig<TCreateSchema>;
  /** Configuration for update operation - generates "update-{entityName}" tool */
  update: CRUDOperationConfig<TUpdateSchema>;
  /** Configuration for delete operation - generates "delete-{entityName}" tool */
  delete: CRUDOperationConfig<TDeleteSchema>;
}

/**
 * Generate CRUD tool definitions for an entity type
 *
 * This factory function creates standardized create, update, and delete tools
 * for any entity type, eliminating code duplication across CRUD operations.
 *
 * The factory generates three tool definitions with consistent behavior:
 * - **create-{entityName}**: Validates input, calls handler.create(), invalidates cache
 * - **update-{entityName}**: Validates input, calls handler.update(), invalidates cache
 * - **delete-{entityName}**: Validates input, calls handler.delete(), invalidates cache
 *
 * Each generated tool includes:
 * - JSON schema converted from Zod schema
 * - Input validation with detailed error messages
 * - Handler instantiation and method execution
 * - Cache invalidation after successful operations
 * - Consistent success/error response formatting
 *
 * @template TCreateSchema - Zod schema type for create operation
 * @template TUpdateSchema - Zod schema type for update operation
 * @template TDeleteSchema - Zod schema type for delete operation
 * @template THandler - Entity handler class type
 *
 * @param config - Entity CRUD configuration with schemas, descriptions, and handler
 * @returns Array of three tool definitions [createTool, updateTool, deleteTool]
 *
 * @example Basic usage
 * ```typescript
 * import { createCRUDTools } from './crud-factory.js';
 * import { entityConfigurations } from './crud-factory-config.js';
 *
 * // Generate tools for categories
 * const categoryTools = createCRUDTools(entityConfigurations.category);
 *
 * // Add to tool registry
 * const toolRegistry = [
 *   ...categoryTools,
 *   // ... other tools
 * ];
 * ```
 *
 * @example Adding a new entity type
 * ```typescript
 * // 1. Define schemas
 * const CreateWidgetSchema = z.object({
 *   name: z.string().min(1),
 *   type: z.enum(['foo', 'bar']),
 * });
 *
 * const UpdateWidgetSchema = z.object({
 *   id: z.string().uuid(),
 *   name: z.string().optional(),
 * });
 *
 * const DeleteWidgetSchema = z.object({
 *   id: z.string().uuid(),
 * });
 *
 * // 2. Create configuration
 * const widgetConfig = {
 *   entityName: 'widget',
 *   displayName: 'widget',
 *   handlerClass: WidgetHandler,
 *   create: {
 *     schema: CreateWidgetSchema,
 *     description: 'Create a new widget...',
 *     requiresWrite: true,
 *     category: 'core',
 *   },
 *   update: {
 *     schema: UpdateWidgetSchema,
 *     description: 'Update an existing widget...',
 *     requiresWrite: true,
 *     category: 'core',
 *   },
 *   delete: {
 *     schema: DeleteWidgetSchema,
 *     description: 'Delete a widget...',
 *     requiresWrite: true,
 *     category: 'core',
 *   },
 * };
 *
 * // 3. Generate tools
 * const widgetTools = createCRUDTools(widgetConfig);
 * // Returns: [create-widget, update-widget, delete-widget]
 * ```
 *
 * @see {@link EntityCRUDConfig} for configuration structure
 * @see {@link CRUDOperationConfig} for operation-specific configuration
 */
export function createCRUDTools<
  TCreateSchema extends z.ZodType,
  TUpdateSchema extends z.ZodType,
  TDeleteSchema extends z.ZodType,
  THandler extends EntityHandler,
>(
  config: EntityCRUDConfig<TCreateSchema, TUpdateSchema, TDeleteSchema, THandler>,
): CategorizedToolDefinition[] {
  const {
    entityName,
    displayName,
    handlerClass,
    create: createConfig,
    update: updateConfig,
    delete: deleteConfig,
  } = config;

  // Generate CREATE tool
  const createTool: CategorizedToolDefinition = {
    schema: {
      name: `create-${entityName}`,
      description: createConfig.description,
      inputSchema: zodToJsonSchema(createConfig.schema) as ToolInput,
    },
    handler: async (args: Record<string, unknown>): Promise<MCPResponse> => {
      try {
        const validated = createConfig.schema.parse(args);
        const handler = new handlerClass();
        const entityId = await handler.create(validated);
        handler.invalidateCache();

        // Extract name from validated data if available for better success message
        const { name } = validated as Record<string, unknown>;
        const successMessage =
          name && typeof name === 'string'
            ? `Successfully created ${displayName} "${name}" with id ${entityId}`
            : `Successfully created ${displayName} with id ${entityId}`;

        return success(successMessage);
      } catch (err) {
        return errorFromCatch(err, {
          fallbackMessage: `Failed to create ${displayName}`,
          operation: 'create',
          tool: `create-${entityName}`,
          args,
        });
      }
    },
    requiresWrite: createConfig.requiresWrite,
    category: createConfig.category,
  };

  // Generate UPDATE tool
  const updateTool: CategorizedToolDefinition = {
    schema: {
      name: `update-${entityName}`,
      description: updateConfig.description,
      inputSchema: zodToJsonSchema(updateConfig.schema) as ToolInput,
    },
    handler: async (args: Record<string, unknown>): Promise<MCPResponse> => {
      try {
        const validated = updateConfig.schema.parse(args);
        const validatedRecord = validated as Record<string, unknown>;
        const { id, ...updateData } = validatedRecord;

        // Check if at least one field is provided for update
        if (Object.keys(updateData).length === 0) {
          return error('No fields provided for update', 'Provide at least one field to update');
        }

        const handler = new handlerClass();
        await handler.update(id as string, updateData);
        handler.invalidateCache();
        return success(`Successfully updated ${displayName} with id ${id as string}`);
      } catch (err) {
        return errorFromCatch(err, {
          fallbackMessage: `Failed to update ${displayName}`,
          operation: 'update',
          tool: `update-${entityName}`,
          args,
        });
      }
    },
    requiresWrite: updateConfig.requiresWrite,
    category: updateConfig.category,
  };

  // Generate DELETE tool
  const deleteTool: CategorizedToolDefinition = {
    schema: {
      name: `delete-${entityName}`,
      description: deleteConfig.description,
      inputSchema: zodToJsonSchema(deleteConfig.schema) as ToolInput,
    },
    handler: async (args: Record<string, unknown>): Promise<MCPResponse> => {
      try {
        const validated = deleteConfig.schema.parse(args);
        const validatedRecord = validated as Record<string, unknown>;
        const { id } = validatedRecord;

        const handler = new handlerClass();
        await handler.delete(id as string);
        handler.invalidateCache();
        return success(`Successfully deleted ${displayName} with id ${id as string}`);
      } catch (err) {
        return errorFromCatch(err, {
          fallbackMessage: `Failed to delete ${displayName}`,
          operation: 'delete',
          tool: `delete-${entityName}`,
          args,
        });
      }
    },
    requiresWrite: deleteConfig.requiresWrite,
    category: deleteConfig.category,
  };

  return [createTool, updateTool, deleteTool];
}
