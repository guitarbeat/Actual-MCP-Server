import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './index.js';
import { CategoryHandler } from './entity-handlers/category-handler.js';
import { CategoryGroupHandler } from './entity-handlers/category-group-handler.js';
import { PayeeHandler } from './entity-handlers/payee-handler.js';
import { RuleHandler } from './entity-handlers/rule-handler.js';
import { ScheduleHandler } from './entity-handlers/schedule-handler.js';
import { EntityErrorBuilder } from './errors/entity-error-builder.js';
import * as response from '../../utils/response.js';

vi.mock('./entity-handlers/category-handler.js');
vi.mock('./entity-handlers/category-group-handler.js');
vi.mock('./entity-handlers/payee-handler.js');
vi.mock('./entity-handlers/rule-handler.js');
vi.mock('./entity-handlers/schedule-handler.js');
vi.mock('../../features.js', () => ({
  features: { manageEntityTool: true },
}));

describe('manage-entity tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call the category handler for category entity type', async () => {
    const args = { entityType: 'category', operation: 'create', data: {} };
    const successSpy = vi.spyOn(response, 'success');
    await handler(args as any);
    expect(CategoryHandler.prototype.create).toHaveBeenCalled();
    expect(successSpy).toHaveBeenCalled();
  });

  it('should call the category group handler for categoryGroup entity type', async () => {
    const args = { entityType: 'categoryGroup', operation: 'create', data: {} };
    const successSpy = vi.spyOn(response, 'success');
    await handler(args as any);
    expect(CategoryGroupHandler.prototype.create).toHaveBeenCalled();
    expect(successSpy).toHaveBeenCalled();
  });

  it('should call the payee handler for payee entity type', async () => {
    const args = { entityType: 'payee', operation: 'create', data: {} };
    const successSpy = vi.spyOn(response, 'success');
    await handler(args as any);
    expect(PayeeHandler.prototype.create).toHaveBeenCalled();
    expect(successSpy).toHaveBeenCalled();
  });

  it('should call the rule handler for rule entity type', async () => {
    const args = { entityType: 'rule', operation: 'create', data: {} };
    const successSpy = vi.spyOn(response, 'success');
    await handler(args as any);
    expect(RuleHandler.prototype.create).toHaveBeenCalled();
    expect(successSpy).toHaveBeenCalled();
  });

  it('should call the schedule handler for schedule entity type', async () => {
    const args = { entityType: 'schedule', operation: 'create', data: {} };
    const successSpy = vi.spyOn(response, 'success');
    await handler(args as any);
    expect(ScheduleHandler.prototype.create).toHaveBeenCalled();
    expect(successSpy).toHaveBeenCalled();
  });

  it('should call the validate method on the handler', async () => {
    const args = { entityType: 'category', operation: 'create', data: {} };
    await handler(args as any);
    expect(CategoryHandler.prototype.validate).toHaveBeenCalledWith('create', undefined, {});
  });

  it('should call the invalidateCache method on the handler after a successful create', async () => {
    const args = { entityType: 'category', operation: 'create', data: {} };
    await handler(args as any);
    expect(CategoryHandler.prototype.invalidateCache).toHaveBeenCalled();
  });

  it('should call the invalidateCache method on the handler after a successful update', async () => {
    const args = { entityType: 'category', operation: 'update', id: '1', data: {} };
    await handler(args as any);
    expect(CategoryHandler.prototype.invalidateCache).toHaveBeenCalled();
  });

  it('should call the invalidateCache method on the handler after a successful delete', async () => {
    const args = { entityType: 'category', operation: 'delete', id: '1' };
    await handler(args as any);
    expect(CategoryHandler.prototype.invalidateCache).toHaveBeenCalled();
  });

  it('should return an error response when handler throws an error', async () => {
    const args = { entityType: 'category', operation: 'create', data: {} };
    const testError = new Error('test error');

    // Mock the create method to throw an error
    vi.spyOn(CategoryHandler.prototype, 'create').mockRejectedValue(testError);

    const result = await handler(args as any);

    // The result should be an MCPResponse with error content
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content[0].type).toBe('text');

    // Parse the error content and verify it contains error information
    const content = (result.content[0] as any).text;
    expect(content).toBeDefined();

    // The content should either be an error message or JSON with error info
    if (content.includes('{')) {
      const errorContent = JSON.parse(content);
      expect(errorContent.error).toBe(true);
    } else {
      expect(content).toContain('category');
    }
  });
});
