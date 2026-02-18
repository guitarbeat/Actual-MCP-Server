import { describe, it, expect } from 'vitest';
import { isId, normalizeName } from './name-utils.js';

describe('name-utils', () => {
  describe('isId', () => {
    it('should return true for strings containing hyphens', () => {
      expect(isId('abc-123-def')).toBe(true);
      expect(isId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should return true for long alphanumeric strings', () => {
      expect(isId('abcdefghijklmnopqrstuvwxyz123')).toBe(true);
    });

    it('should return false for short strings', () => {
      expect(isId('abc')).toBe(false);
      expect(isId('checking')).toBe(false);
    });

    it('should return false for strings with special characters', () => {
      expect(isId('my account name')).toBe(false);
      expect(isId('account@123')).toBe(false);
    });
  });

  describe('normalizeName', () => {
    it('should convert to lowercase', () => {
      expect(normalizeName('Chase Checking')).toBe('chase checking');
      expect(normalizeName('SAVINGS')).toBe('savings');
    });

    it('should trim whitespace', () => {
      expect(normalizeName('  Account  ')).toBe('account');
      expect(normalizeName('\tChecking\n')).toBe('checking');
    });

    it('should remove emojis', () => {
      expect(normalizeName('🏦 Chase Checking')).toBe('chase checking');
      expect(normalizeName('💰 Savings')).toBe('savings');
      expect(normalizeName('Credit Card 💳')).toBe('credit card');
    });

    it('should handle combination of normalization', () => {
      expect(normalizeName('  🏦 Chase CHECKING  ')).toBe('chase checking');
    });
  });
});
