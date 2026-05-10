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
  /** Entity name used in tool names (e.g., "category" → "manage-category") */
  entityName: string;
  /** Display name for success/error messages (e.g., "category", "payee") */
  displayName: string;
  /** Entity handler class constructor - instantiated for each operation */
  handlerClass: new () => THandler;
  /** Configuration for create operation */
  create: CRUDOperationConfig<TCreateSchema>;
  /** Configuration for update operation */
  update: CRUDOperationConfig<TUpdateSchema>;
  /** Configuration for delete operation */
  delete: CRUDOperationConfig<TDeleteSchema>;
}

// ----------------------------
// UNIFIED CRUD TOOL (recommended)
// ----------------------------

/**
 * Build a unified JSON Schema from three separate operation schemas.
 *
 * Merges all properties from the create, update, and delete schemas into a single
 * flat schema with an `action` discriminator field. Only `action` is required at
 * the schema level — per-action field requirements are documented in descriptions
 * and validated at runtime by the appropriate Zod schema.
 *
 * Uses `$refStrategy: 'none'` to inline all `$defs` and avoid reference conflicts
 * when merging properties from different schemas.
 */
function buildUnifiedInputSchema<
  TCreate extends z.ZodType,
  TUpdate extends z.ZodType,
  TDelete extends z.ZodType,
>(createSchema: TCreate, updateSchema: TUpdate, deleteSchema: TDelete): ToolInput {
  const schemas = [createSchema, updateSchema, deleteSchema];
  const allProperties: Record<string, unknown> = {
    action: {
      type: 'string',
      enum: ['create', 'update', 'delete'],
      description:
        'The operation to perform: "create" (new entity), "update" (modify existing), or "delete" (remove permanently).',
    },
  };

  for (const schema of schemas) {
    const json = zodToJsonSchema(schema, { $refStrategy: 'none' }) as Record<string, unknown>;
    const properties = json.properties as Record<string, unknown> | undefined;
    if (properties) {
      for (const [key, value] of Object.entries(properties)) {
        if (!allProperties[key]) {
          allProperties[key] = value;
        }
      }
    }
  }

  return {
    type: 'object',
    properties: allProperties,
    required: ['action'],
    additionalProperties: false,
  } as unknown as ToolInput;
}

/**
 * Generate a single unified CRUD tool for an entity type
 *
 * Instead of generating three separate tools (create-X, update-X, delete-X),
 * this creates one **manage-X** tool with an `action` discriminator field.
 * This reduces tool count from 3N to N and improves LLM tool selection accuracy
 * by presenting fewer, semantically clearer choices.
 *
 * The unified tool:
 * - Accepts `action: "create" | "update" | "delete"` to select the operation
 * - Validates input with the appropriate Zod schema for the selected action
 * - Returns the same success/error responses as the individual CRUD tools
 *
 * @param config - Entity CRUD configuration (same structure as createCRUDTools)
 * @returns A single tool definition named manage-{entityName}
 *
 * @example
 * ```typescript
 * const categoryTool = createUnifiedCRUDTool(entityConfigurations.category);
 * // Creates: manage-category (replaces create-category, update-category, delete-category)
 * ```
 */
export function createUnifiedCRUDTool<
  TCreateSchema extends z.ZodType,
  TUpdateSchema extends z.ZodType,
  TDeleteSchema extends z.ZodType,
  THandler extends EntityHandler,
>(
  config: EntityCRUDConfig<TCreateSchema, TUpdateSchema, TDeleteSchema, THandler>,
): CategorizedToolDefinition {
  const {
    entityName,
    displayName,
    handlerClass,
    create: createConfig,
    update: updateConfig,
    delete: deleteConfig,
  } = config;

  const unifiedInputSchema = buildUnifiedInputSchema(
    createConfig.schema,
    updateConfig.schema,
    deleteConfig.schema,
  );

  const description =
    `Create, update, or delete a ${displayName}. ` +
    `Set "action" to "create", "update", or "delete" and include the relevant fields.\n\n` +
    `── action: "create" ──\n${createConfig.description}\n\n` +
    `── action: "update" ──\n${updateConfig.description}\n\n` +
    `── action: "delete" ──\n${deleteConfig.description}`;

  return {
    schema: {
      name: `manage-${entityName}`,
      description,
      inputSchema: unifiedInputSchema,
    },
    handler: async (args: Record<string, unknown>): Promise<MCPResponse> => {
      const { action, ...rest } = args;

      if (!action || !['create', 'update', 'delete'].includes(action as string)) {
        return error(
          `Invalid action: ${String(action)}`,
          'Provide action as "create", "update", or "delete".',
        );
      }

      try {
        const handler = new handlerClass();

        switch (action) {
          case 'create': {
            const validated = createConfig.schema.parse(rest);
            const entityId = await handler.create(validated);
            handler.invalidateCache();
            const { name } = validated as Record<string, unknown>;
            const msg =
              name && typeof name === 'string'
                ? `Successfully created ${displayName} "${name}" with id ${entityId}`
                : `Successfully created ${displayName} with id ${entityId}`;
            return success(msg);
          }
          case 'update': {
            const validated = updateConfig.schema.parse(rest);
            const validatedRecord = validated as Record<string, unknown>;
            const { id, ...updateData } = validatedRecord;
            if (Object.keys(updateData).length === 0) {
              return error(
                'No fields provided for update',
                'Provide at least one field to update',
              );
            }
            await handler.update(id as string, updateData);
            handler.invalidateCache();
            return success(`Successfully updated ${displayName} with id ${id as string}`);
          }
          case 'delete': {
            const validated = deleteConfig.schema.parse(rest);
            const validatedRecord = validated as Record<string, unknown>;
            const { id } = validatedRecord;
            await handler.delete(id as string);
            handler.invalidateCache();
            return success(`Successfully deleted ${displayName} with id ${id as string}`);
          }
          default:
            return error(
              `Unknown action: ${String(action)}`,
              'Use "create", "update", or "delete"',
            );
        }
      } catch (err) {
        return errorFromCatch(err, {
          fallbackMessage: `Failed to ${String(action)} ${displayName}`,
          operation: String(action),
          tool: `manage-${entityName}`,
          args,
        });
      }
    },
    requiresWrite: true,
    category: createConfig.category,
  };
}

// ----------------------------
// LEGACY CRUD TOOLS (deprecated — prefer createUnifiedCRUDTool)
// ----------------------------

/**
 * Generate three separate CRUD tool definitions for an entity type
 *
 * @deprecated Use {@link createUnifiedCRUDTool} instead — it produces a single
 * manage-{entityName} tool with an action discriminator, reducing tool count
 * from 3N to N and improving LLM tool selection accuracy.
 *
 * @param config - Entity CRUD configuration with schemas, descriptions, and handler
 * @returns Array of three tool definitions [createTool, updateTool, deleteTool]
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
