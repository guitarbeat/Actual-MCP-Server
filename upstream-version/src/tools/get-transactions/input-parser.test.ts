
import { describe, it, expect } from 'vitest';
import { GetTransactionsInputParser } from './input-parser.js';

describe('GetTransactionsInputParser', () => {
  const parser = new GetTransactionsInputParser();

  it('should parse valid arguments correctly', () => {
    const args = {
      accountId: 'Checking',
      startDate: '2023-01-01',
      limit: 10,
    };
    const result = parser.parse(args);
    expect(result).toEqual({
      accountId: 'Checking',
      startDate: '2023-01-01',
      endDate: undefined,
      minAmount: undefined,
      maxAmount: undefined,
      categoryName: undefined,
      payeeName: undefined,
      limit: 10,
      excludeTransfers: undefined,
    });
  });

  it('should throw helpful error for missing arguments object', () => {
    expect(() => parser.parse(null)).toThrow(
      "Invalid arguments: 'args' must be an object. Please check the tool schema for the correct input format."
    );
  });

  it('should throw helpful error for missing accountId', () => {
    expect(() => parser.parse({})).toThrow(
      "Missing or invalid 'accountId'. Please provide an account name (e.g., 'Checking', 'Savings') or 'all' to search across all accounts."
    );
  });

  it('should throw helpful error for invalid startDate', () => {
    expect(() => parser.parse({ accountId: 'Checking', startDate: 123 })).toThrow(
      "Invalid 'startDate': Must be a string in YYYY-MM-DD format."
    );
  });

  it('should throw helpful error for invalid limit', () => {
    expect(() => parser.parse({ accountId: 'Checking', limit: -5 })).toThrow(
      "Invalid 'limit': Must be a positive number."
    );
  });
});
