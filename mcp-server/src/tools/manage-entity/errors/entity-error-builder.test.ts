import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EntityErrorBuilder } from './entity-error-builder.js';

vi.mock('../../../core/response/error-builder.js', () => ({
  notFoundError: vi.fn((entity: string, id: string, opts?: object) => ({
    type: 'notFound',
    entity,
    id,
    ...opts,
  })),
  validationError: vi.fn((msg: string, opts?: object) => ({
    type: 'validation',
    message: msg,
    ...opts,
  })),
  apiError: vi.fn((msg: string, err: unknown, opts?: object) => ({
    type: 'api',
    message: msg,
    err,
    ...opts,
  })),
  unsupportedFeatureError: vi.fn((feature: string, opts?: object) => ({
    type: 'unsupported',
    feature,
    ...opts,
  })),
}));

describe('EntityErrorBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('notFound', () => {
    it('builds a not-found error with entity name and id', () => {
      const err = EntityErrorBuilder.notFound('category', 'cat-123');
      expect(err).toMatchObject({ type: 'notFound', entity: 'Category', id: 'cat-123' });
    });

    it('formats categoryGroup entity name as "Category Group"', () => {
      const err = EntityErrorBuilder.notFound('categoryGroup', 'grp-1') as Record<string, unknown>;
      expect(err.entity).toBe('Category Group');
    });

    it('capitalizes other entity names', () => {
      const err = EntityErrorBuilder.notFound('payee', 'p-1') as Record<string, unknown>;
      expect(err.entity).toBe('Payee');
    });

    it('includes suggestion referencing the list tool', () => {
      const err = EntityErrorBuilder.notFound('rule', 'r-1') as Record<string, unknown>;
      expect(String(err.suggestion)).toContain('get-rules');
    });
  });

  describe('validationError', () => {
    it('includes field and entity type context', () => {
      const err = EntityErrorBuilder.validationError('category', 'name', 'too short');
      expect(err).toMatchObject({ type: 'validation' });
    });
  });

  describe('operationError', () => {
    it('builds an api error with entity and operation info', () => {
      const originalErr = new Error('database down');
      const err = EntityErrorBuilder.operationError('payee', 'create', originalErr);
      expect(err).toMatchObject({ type: 'api' });
    });

    it('includes suggestion for the given entity type', () => {
      const err = EntityErrorBuilder.operationError(
        'schedule',
        'delete',
        new Error('fail'),
      ) as Record<string, unknown>;
      expect(String(err.suggestion)).toContain('get-schedules');
    });
  });

  describe('unsupportedFeature', () => {
    it('builds an unsupported error for schedules with upgrade suggestion', () => {
      const err = EntityErrorBuilder.unsupportedFeature('schedule', 'create') as Record<
        string,
        unknown
      >;
      expect(err.type).toBe('unsupported');
      expect(String(err.suggestion)).toContain('Upgrade');
    });

    it('builds an unsupported error without operation when not provided', () => {
      const err = EntityErrorBuilder.unsupportedFeature('schedule') as Record<string, unknown>;
      expect(err.type).toBe('unsupported');
    });

    it('uses generic suggestion for non-schedule entity types', () => {
      const err = EntityErrorBuilder.unsupportedFeature('payee', 'create') as Record<
        string,
        unknown
      >;
      expect(String(err.suggestion)).toContain('Upgrade');
    });
  });

  describe('missingParameter', () => {
    it('returns validation error for missing id', () => {
      const err = EntityErrorBuilder.missingParameter('update', 'id');
      expect(err).toMatchObject({ type: 'validation' });
    });

    it('returns validation error for missing data', () => {
      const err = EntityErrorBuilder.missingParameter('create', 'data');
      expect(err).toMatchObject({ type: 'validation' });
    });

    it('includes field in the error', () => {
      const err = EntityErrorBuilder.missingParameter('delete', 'id') as Record<string, unknown>;
      expect(err.field).toBe('id');
    });
  });
});
