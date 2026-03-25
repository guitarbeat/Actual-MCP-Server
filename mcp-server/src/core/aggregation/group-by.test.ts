import { describe, expect, it } from 'vitest';
import type { CategorySpending } from '../types/domain.js';
import { GroupAggregator } from './group-by.js';

describe('GroupAggregator', () => {
  it('should aggregate and sort correctly', () => {
    const aggregator = new GroupAggregator();

    const spending: Record<string, CategorySpending> = {
      cat1: {
        id: 'cat1',
        name: 'Food',
        group: 'Living',
        isIncome: false,
        total: -5000,
        transactions: 2,
      },
      cat2: {
        id: 'cat2',
        name: 'Rent',
        group: 'Living',
        isIncome: false,
        total: -100000,
        transactions: 1,
      },
      cat3: {
        id: 'cat3',
        name: 'Salary',
        group: 'Income',
        isIncome: true,
        total: 200000,
        transactions: 1,
      },
      cat4: {
        id: 'cat4',
        name: 'Bonus',
        group: 'Income',
        isIncome: true,
        total: 50000,
        transactions: 1,
      },
      cat5: {
        id: 'cat5',
        name: 'Fun',
        group: 'Entertainment',
        isIncome: false,
        total: -2000,
        transactions: 5,
      },
    };

    const result = aggregator.aggregateAndSort(spending);

    // Expected order:
    // 1. Income (250000 total)
    // 2. Living (-105000 total -> abs 105000)
    // 3. Entertainment (-2000 total -> abs 2000)

    expect(result).toHaveLength(3);

    expect(result[0].name).toBe('Income');
    expect(result[0].total).toBe(250000);
    // Inside Income: Salary (200000) > Bonus (50000)
    expect(result[0].categories[0].name).toBe('Salary');
    expect(result[0].categories[1].name).toBe('Bonus');

    expect(result[1].name).toBe('Living');
    expect(result[1].total).toBe(-105000);
    // Inside Living: Rent (-100000 -> abs 100000) > Food (-5000 -> abs 5000)
    expect(result[1].categories[0].name).toBe('Rent');
    expect(result[1].categories[1].name).toBe('Food');

    expect(result[2].name).toBe('Entertainment');
    expect(result[2].total).toBe(-2000);
  });

  it('should handle empty input', () => {
    const aggregator = new GroupAggregator();
    const result = aggregator.aggregateAndSort({});
    expect(result).toEqual([]);
  });

  it('should handle single category', () => {
    const aggregator = new GroupAggregator();
    const spending: Record<string, CategorySpending> = {
      cat1: {
        id: 'cat1',
        name: 'Food',
        group: 'Living',
        isIncome: false,
        total: -5000,
        transactions: 2,
      },
    };
    const result = aggregator.aggregateAndSort(spending);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Living');
    expect(result[0].total).toBe(-5000);
    expect(result[0].categories).toHaveLength(1);
  });

  it('should ignore inherited properties in spendingByCategory', () => {
    const aggregator = new GroupAggregator();

    // Create an object that inherits from another object
    const prototype = {
      inherited: {
        id: 'inherited',
        name: 'Inherited',
        group: 'Other',
        isIncome: false,
        total: -1000,
        transactions: 1,
      },
    };

    const spending = Object.create(prototype);
    spending.cat1 = {
      id: 'cat1',
      name: 'Food',
      group: 'Living',
      isIncome: false,
      total: -5000,
      transactions: 2,
    };

    const result = aggregator.aggregateAndSort(spending);

    // It should only process own properties, not inherited ones
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Living');
    expect(result[0].total).toBe(-5000);
  });

  it('should handle undefined or falsy totals as 0', () => {
    const aggregator = new GroupAggregator();
    const spending: Record<string, CategorySpending> = {
      cat1: {
        id: 'cat1',
        name: 'Food',
        group: 'Living',
        isIncome: false,
        total: undefined as unknown as number, // Force undefined
        transactions: 2,
      },
      cat2: {
        id: 'cat2',
        name: 'Rent',
        group: 'Living',
        isIncome: false,
        total: 0,
        transactions: 1,
      },
      cat3: {
        id: 'cat3',
        name: 'Salary',
        group: 'Income',
        isIncome: true,
        total: NaN,
        transactions: 1,
      },
    };

    const result = aggregator.aggregateAndSort(spending);

    // It should treat falsy totals as 0
    expect(result).toHaveLength(2);

    const livingGroup = result.find((g) => g.name === 'Living');
    expect(livingGroup).toBeDefined();
    expect(livingGroup!.total).toBe(0);

    const incomeGroup = result.find((g) => g.name === 'Income');
    expect(incomeGroup).toBeDefined();
    expect(incomeGroup!.total).toBe(0);
  });
});

describe('byId', () => {
  it('should handle empty array', () => {
    const aggregator = new GroupAggregator();
    const result = aggregator.byId([]);
    expect(result).toEqual({});
  });

  it('should create record mapped by id', () => {
    const aggregator = new GroupAggregator();
    const items = [
      { id: '1', value: 'a' },
      { id: '2', value: 'b' },
    ];
    const result = aggregator.byId(items);
    expect(result).toEqual({
      '1': { id: '1', value: 'a' },
      '2': { id: '2', value: 'b' },
    });
  });

  it('should use last item for duplicate ids', () => {
    const aggregator = new GroupAggregator();
    const items = [
      { id: '1', value: 'first' },
      { id: '1', value: 'second' },
    ];
    const result = aggregator.byId(items);
    expect(result).toEqual({
      '1': { id: '1', value: 'second' },
    });
  });
});
