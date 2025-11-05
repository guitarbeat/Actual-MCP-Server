import { describe, it, expect } from 'vitest';
import { GetAccountsInputParser } from './input-parser.js';

describe('GetAccountsInputParser', () => {
  const parser = new GetAccountsInputParser();

  it('should parse with no arguments and apply defaults', () => {
    const result = parser.parse();

    expect(result).toEqual({
      accountId: undefined,
      includeClosed: false,
    });
  });

  it('should parse with accountId filter', () => {
    const result = parser.parse({ accountId: 'checking-account-id' });

    expect(result).toEqual({
      accountId: 'checking-account-id',
      includeClosed: false,
    });
  });

  it('should parse with includeClosed option', () => {
    const result = parser.parse({ includeClosed: true });

    expect(result).toEqual({
      accountId: undefined,
      includeClosed: true,
    });
  });

  it('should parse with all options', () => {
    const result = parser.parse({
      accountId: 'savings-account-id',
      includeClosed: true,
    });

    expect(result).toEqual({
      accountId: 'savings-account-id',
      includeClosed: true,
    });
  });
});
