// ----------------------------
// BASE ENTITY HANDLER INTERFACE
// ----------------------------

/**
 * Operation types supported by entity handlers
 * Standard CRUD operations are supported by all entities
 * Extended operations (close, reopen, balance) are account-specific
 */
export type Operation = 'create' | 'update' | 'delete' | 'close' | 'reopen' | 'balance';

/**
 * Base interface for all entity handlers
 * Each entity type (category, payee, rule, etc.) implements this interface
 * to provide consistent CRUD operations with type safety
 */
export interface EntityHandler<TCreateData = unknown, TUpdateData = unknown> {
  /**
   * Create a new entity
   * @param data - Entity-specific creation data
   * @returns The ID of the created entity
   */
  create(data: TCreateData): Promise<string>;

  /**
   * Update an existing entity
   * @param id - The entity ID
   * @param data - Entity-specific update data
   * @returns void on success
   */
  update(id: string, data: TUpdateData): Promise<void>;

  /**
   * Delete an entity
   * @param id - The entity ID
   * @returns void on success
   */
  delete(id: string): Promise<void>;

  /**
   * Validate operation requirements before execution
   * @param operation - The operation to validate
   * @param id - The entity ID (required for update/delete)
   * @param data - The entity data (required for create/update)
   * @throws Error if validation fails
   */
  validate(operation: Operation, id?: string, data?: unknown): void;
  invalidateCache(): void;
}
