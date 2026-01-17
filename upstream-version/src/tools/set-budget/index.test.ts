import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';
import type { SetBudgetArgs } from './types.js';

const mockApi = vi.hoisted(() => ({
  setBudgetAmount: vi.fn(),
  setBudgetCarryover: vi.fn(),
}));

const mockNameResolver = vi.hoisted(() => ({
  resolveCategory: vi.fn(),
}));

vi.mock('../../actual-api.js', () => mockApi);
vi.mock('../../core/utils/name-resolver.js', () => ({
  nameResolver: mockNameResolver,
}));

describe('set-budget tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNameResolver.resolveCategory.mockResolvedValue('cat-123');
  });

  it('sets amount only', async () => {
    const args: SetBudgetArgs = {
      month: '2025-03',
      category: 'Groceries',
      amount: 500, // Dollars (will be converted to 50000 cents)
    };

    const response = await handler(args);

    expect(mockNameResolver.resolveCategory).toHaveBeenCalledWith('Groceries');
    expect(mockApi.setBudgetAmount).toHaveBeenCalledWith('2025-03', 'cat-123', 50000);
    expect(mockApi.setBudgetCarryover).not.toHaveBeenCalled();
    const text = (response.content?.[0] as { text: string }).text;
    expect(text).toContain('Successfully updated budget');
    expect(text).toContain('amount set to $500.00');
  });

  it('sets carryover only', async () => {
    const args: SetBudgetArgs = {
      month: '2025-03',
      category: 'Groceries',
      carryover: true,
    };

    const response = await handler(args);

    expect(mockNameResolver.resolveCategory).toHaveBeenCalledWith('Groceries');
    expect(mockApi.setBudgetCarryover).toHaveBeenCalledWith('2025-03', 'cat-123', true);
    expect(mockApi.setBudgetAmount).not.toHaveBeenCalled();
    const text = (response.content?.[0] as { text: string }).text;
    expect(text).toContain('Successfully updated budget');
    expect(text).toContain('carryover enabled');
  });

  it('sets both amount and carryover', async () => {
    const args: SetBudgetArgs = {
      month: '2025-03',
      category: 'Groceries',
      amount: 500, // Dollars (will be converted to 50000 cents)
      carryover: false,
    };

    const response = await handler(args);

    expect(mockNameResolver.resolveCategory).toHaveBeenCalledWith('Groceries');
    expect(mockApi.setBudgetAmount).toHaveBeenCalledWith('2025-03', 'cat-123', 50000);
    expect(mockApi.setBudgetCarryover).toHaveBeenCalledWith('2025-03', 'cat-123', false);
    const text = (response.content?.[0] as { text: string }).text;
    expect(text).toContain('Successfully updated budget');
    expect(text).toContain('amount set to $500.00');
    expect(text).toContain('carryover disabled');
  });

  it('resolves category name to ID', async () => {
    mockNameResolver.resolveCategory.mockResolvedValue('resolved-cat-id');

    const args: SetBudgetArgs = {
      month: '2025-03',
      category: 'Food',
      amount: 300, // Dollars (will be converted to 30000 cents)
    };

    await handler(args);

    expect(mockNameResolver.resolveCategory).toHaveBeenCalledWith('Food');
    expect(mockApi.setBudgetAmount).toHaveBeenCalledWith('2025-03', 'resolved-cat-id', 30000);
  });

  it('handles amounts in cents (>= 1000)', async () => {
    const args: SetBudgetArgs = {
      month: '2025-03',
      category: 'Groceries',
      amount: 50000, // >= 1000, treated as cents
    };

    const response = await handler(args);

    expect(mockApi.setBudgetAmount).toHaveBeenCalledWith('2025-03', 'cat-123', 50000);
    const text = (response.content?.[0] as { text: string }).text;
    expect(text).toContain('amount set to $500.00');
  });

  it('rejects negative amounts', async () => {
    const args = {
      month: '2025-03',
      category: 'Groceries',
      amount: -100, // Negative amount should be rejected
    };

    const response = await handler(args as unknown as SetBudgetArgs);

    expect(response.isError).toBe(true);
    expect(mockApi.setBudgetAmount).not.toHaveBeenCalled();
  });

  it('returns error when neither amount nor carryover provided', async () => {
    const args = {
      month: '2025-03',
      category: 'Groceries',
    } as SetBudgetArgs;

    const response = await handler(args);

    expect(response.isError).toBe(true);
  });

  it('returns error for invalid month format', async () => {
    const args = {
      month: '2025-3',
      category: 'Groceries',
      amount: 500, // Dollars
    } as SetBudgetArgs;

    const response = await handler(args);

    expect(response.isError).toBe(true);
  });
});
