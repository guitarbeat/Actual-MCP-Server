import { describe, it, expect } from 'vitest';
import { isLocationEligibleTransaction, mergeTimelineNotes } from './classification.js';
import type { Transaction } from '../../types/domain.js';
import { TIMELINE_NOTE_PREFIX, INELIGIBLE_MERCHANT_PATTERNS } from './constants.js';

describe('classification', () => {
  describe('isLocationEligibleTransaction', () => {
    it('returns false if transaction already has a category', () => {
      const tx = { category: 'cat-123', imported_payee: 'Starbucks' } as unknown as Transaction;
      expect(isLocationEligibleTransaction(tx)).toBe(false);
    });

    it('returns false for transfers', () => {
      const tx = { transfer_id: 'trans-123', imported_payee: 'Transfer' } as unknown as Transaction;
      expect(isLocationEligibleTransaction(tx)).toBe(false);
    });

    it('returns false for child or parent transactions', () => {
      expect(
        isLocationEligibleTransaction({
          is_child: true,
          imported_payee: 'A',
        } as unknown as Transaction),
      ).toBe(false);
      expect(
        isLocationEligibleTransaction({
          is_parent: true,
          imported_payee: 'B',
        } as unknown as Transaction),
      ).toBe(false);
    });

    it('returns false for starting balances', () => {
      const tx = { starting_balance_flag: true, imported_payee: 'C' } as unknown as Transaction;
      expect(isLocationEligibleTransaction(tx)).toBe(false);
    });

    it('returns false if there is no recognizable merchant text', () => {
      const tx = { imported_payee: null, payee_name: null } as unknown as Transaction;
      expect(isLocationEligibleTransaction(tx)).toBe(false);
    });

    it('returns false if merchant text matches an ineligible pattern', () => {
      if (INELIGIBLE_MERCHANT_PATTERNS.length > 0) {
        const tx = { imported_payee: INELIGIBLE_MERCHANT_PATTERNS[0] } as unknown as Transaction;
        expect(isLocationEligibleTransaction(tx)).toBe(false);
      }
    });

    it('returns true for a normal retail transaction', () => {
      const tx = { imported_payee: 'Target Store 123' } as unknown as Transaction;
      expect(isLocationEligibleTransaction(tx)).toBe(true);
    });
  });

  describe('mergeTimelineNotes', () => {
    it('returns undefined if noteText is null', () => {
      expect(mergeTimelineNotes('Existing note', null)).toBeUndefined();
    });

    it('returns just the noteText if existing is null', () => {
      expect(mergeTimelineNotes(null, 'New note')).toBe('New note');
    });

    it('merges new note text and removes existing timeline notes', () => {
      const existing = `Line 1\n${TIMELINE_NOTE_PREFIX}Old Location\nLine 2`;
      const result = mergeTimelineNotes(existing, `${TIMELINE_NOTE_PREFIX}New Location`);
      expect(result).toBe(`Line 1\nLine 2\n${TIMELINE_NOTE_PREFIX}New Location`);
    });

    it('preserves empty lines if they existed but strips out trailing spaces', () => {
      const existing = 'Line 1 \n\nLine 2';
      const result = mergeTimelineNotes(existing, 'New note');
      expect(result).toBe('Line 1\nLine 2\nNew note');
    });
  });
});
