import { z } from 'zod';
import { createTag, deleteTag, updateTag } from '../../../core/api/actual-client.js';
import { cacheService } from '../../../core/cache/cache-service.js';
import { EntityErrorBuilder } from '../errors/entity-error-builder.js';
import type { EntityHandler, Operation } from './base-handler.js';

export interface TagData {
  tag: string;
  color?: string | null;
  description?: string | null;
}

const TagDataSchema = z.object({
  tag: z
    .string()
    .min(1, 'Tag label is required')
    .max(100, 'Tag label must be less than 100 characters'),
  color: z.string().max(50, 'Tag color must be less than 50 characters').nullable().optional(),
  description: z
    .string()
    .max(500, 'Tag description must be less than 500 characters')
    .nullable()
    .optional(),
});

export class TagHandler implements EntityHandler<TagData, Partial<TagData>> {
  async create(data: TagData): Promise<string> {
    const validated = TagDataSchema.parse(data);
    return createTag(validated);
  }

  async update(id: string, data: Partial<TagData>): Promise<void> {
    const validated = TagDataSchema.partial().parse(data);
    await updateTag(id, validated);
  }

  async delete(id: string): Promise<void> {
    await deleteTag(id);
  }

  validate(operation: Operation, id?: string, data?: unknown): void {
    if (operation !== 'create' && !id) {
      throw EntityErrorBuilder.missingParameter(operation, 'id');
    }
    if (operation !== 'delete' && !data) {
      throw EntityErrorBuilder.missingParameter(operation, 'data');
    }
  }

  invalidateCache(): void {
    cacheService.invalidate('tags:all');
  }
}
