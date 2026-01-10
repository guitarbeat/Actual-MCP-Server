import { describe, it, expect } from 'vitest';
import { escapeHtml } from './html-utils.js';

describe('HTML Utils', () => {
  describe('escapeHtml', () => {
    it('should escape special HTML characters', () => {
      const input = '<script>alert("xss")</script>';
      const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
      expect(escapeHtml(input)).toBe(expected);
    });

    it('should handle ampersands', () => {
      const input = 'Tom & Jerry';
      const expected = 'Tom &amp; Jerry';
      expect(escapeHtml(input)).toBe(expected);
    });

    it('should handle single quotes', () => {
      const input = "'OR 1=1";
      const expected = '&#039;OR 1=1';
      expect(escapeHtml(input)).toBe(expected);
    });

    it('should handle numbers', () => {
      const input = 123;
      const expected = '123';
      expect(escapeHtml(input)).toBe(expected);
    });

    it('should handle mixed content', () => {
      const input = 'Hello <world>!';
      const expected = 'Hello &lt;world&gt;!';
      expect(escapeHtml(input)).toBe(expected);
    });
  });
});
