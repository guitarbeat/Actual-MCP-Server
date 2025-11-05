import { describe, it, expect } from 'vitest';
import { GetAccountsInputParser } from './input-parser.js';

describe('GetAccountsInputParser', () => {
  const parser = new GetAccountsInputParser();

  it('should parse with no arguments', () => {
    const result = parser.parse();

    expect(result).toEqual({});
  });
});
