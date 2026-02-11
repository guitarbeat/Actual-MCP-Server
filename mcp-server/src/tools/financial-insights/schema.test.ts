import { describe, expect, it } from 'vitest';
import { FinancialInsightsArgsSchema } from '../../core/types/schemas.js';

describe('FinancialInsightsArgsSchema', () => {
  it('should validate valid month', () => {
    const validData = {
      month: '2023-10',
    };
    const result = FinancialInsightsArgsSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should validate empty input (defaults)', () => {
    const validData = {};
    const result = FinancialInsightsArgsSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid month format', () => {
    const invalidInputs = [
      '2023-1',       // Too short
      '2023-100',     // Too long
      '23-10',        // Short year
      '2023/10',      // Wrong separator
      'October 2023', // Name
      // SQL/AQL Injection attempts
      "2023-10' OR 1=1",
      "2023-10; DROP TABLE users",
      "2023-10\nDELETE FROM transactions",
    ];

    for (const input of invalidInputs) {
      const result = FinancialInsightsArgsSchema.safeParse({ month: input });
      expect(result.success).toBe(false);
    }
  });

  it('should validate optional boolean and number fields', () => {
    const validData = {
      month: '2023-10',
      includeSchedules: false,
      scheduleDays: 30,
    };
    const result = FinancialInsightsArgsSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid types for other fields', () => {
    const invalidData = {
      includeSchedules: 'yes', // should be boolean
      scheduleDays: '30',      // should be number
    };
    const result = FinancialInsightsArgsSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
