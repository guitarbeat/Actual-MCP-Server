import { describe, expect, it } from 'vitest';
import { error, errorFromCatch, success, successWithContent, successWithJson } from './response-builder.js';

describe('Response Builder', () => {
  describe('success', () => {
    it('should create a success response with text content', () => {
      const result = success('Operation completed successfully');

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Operation completed successfully',
          },
        ],
      });
      expect(result.isError).toBeUndefined();
    });

    it('should handle empty string', () => {
      const result = success('');

      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: '',
      });
    });

    it('should handle multiline text', () => {
      const multilineText = 'Line 1\nLine 2\nLine 3';
      const result = success(multilineText);

      expect(result.content[0]).toEqual({
        type: 'text',
        text: multilineText,
      });
    });
  });

  describe('successWithContent', () => {
    it('should create a success response with custom content', () => {
      const content = {
        type: 'text' as const,
        text: 'Custom content',
      };

      const result = successWithContent(content);

      expect(result).toEqual({
        content: [content],
      });
    });
  });

  describe('successWithJson', () => {
    it('should create a success response with JSON data', () => {
      const data = { id: '123', name: 'Test Account', balance: 1000 };

      const result = successWithJson(data);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      const text = (result.content[0] as { text: string }).text;
      expect(JSON.parse(text)).toEqual(data);
    });

    it('should handle arrays', () => {
      const data = [
        { id: '1', name: 'Account 1' },
        { id: '2', name: 'Account 2' },
      ];

      const result = successWithJson(data);

      const text = (result.content[0] as { text: string }).text;
      expect(JSON.parse(text)).toEqual(data);
    });

    it('should handle null values', () => {
      const result = successWithJson(null);

      const text = (result.content[0] as { text: string }).text;
      expect(JSON.parse(text)).toBeNull();
    });
  });

  describe('error', () => {
    it('should create an error response with message and suggestion', () => {
      const result = error('Invalid account ID', 'Use get-accounts to list valid IDs');

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);

      const text = (result.content[0] as { text: string }).text;
      const payload = JSON.parse(text);
      expect(payload).toEqual({
        error: true,
        message: 'Invalid account ID',
        suggestion: 'Use get-accounts to list valid IDs',
      });
    });

    it('should handle empty suggestion', () => {
      const result = error('Something went wrong', '');

      const text = (result.content[0] as { text: string }).text;
      const payload = JSON.parse(text);
      expect(payload.suggestion).toBe('');
    });
  });

  describe('errorFromCatch', () => {
    it('should handle Error objects', () => {
      const err = new Error('Database connection failed');

      const result = errorFromCatch(err);

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      const payload = JSON.parse(text);
      expect(payload.message).toBe('Database connection failed');
      expect(payload.suggestion).toContain('Check the Actual Budget server logs');
    });

    it('should handle string errors', () => {
      const result = errorFromCatch('Simple error string');

      const text = (result.content[0] as { text: string }).text;
      const payload = JSON.parse(text);
      expect(payload.message).toBe('Simple error string');
    });

    it('should handle unknown error types with fallback message', () => {
      const result = errorFromCatch(null, {
        fallbackMessage: 'Fallback error message',
      });

      const text = (result.content[0] as { text: string }).text;
      const payload = JSON.parse(text);
      expect(payload.message).toBe('Fallback error message');
    });

    it('should use custom suggestion when provided', () => {
      const err = new Error('Custom error');
      const result = errorFromCatch(err, {
        suggestion: 'Try restarting the server',
      });

      const text = (result.content[0] as { text: string }).text;
      const payload = JSON.parse(text);
      expect(payload.suggestion).toBe('Try restarting the server');
    });

    it('should infer suggestion for accountId errors', () => {
      const err = new Error('Invalid accountId provided');

      const result = errorFromCatch(err);

      const text = (result.content[0] as { text: string }).text;
      const payload = JSON.parse(text);
      expect(payload.suggestion).toContain('get-accounts');
    });

    it('should infer suggestion for categoryId errors', () => {
      const err = new Error('categoryId not found');

      const result = errorFromCatch(err);

      const text = (result.content[0] as { text: string }).text;
      const payload = JSON.parse(text);
      expect(payload.suggestion).toContain('get-grouped-categories');
    });

    it('should infer suggestion for month errors', () => {
      const err = new Error('Invalid month format');

      const result = errorFromCatch(err);

      const text = (result.content[0] as { text: string }).text;
      const payload = JSON.parse(text);
      expect(payload.suggestion).toContain('YYYY-MM');
    });

    it('should use default suggestion when no pattern matches', () => {
      const err = new Error('Unexpected error occurred');

      const result = errorFromCatch(err);

      const text = (result.content[0] as { text: string }).text;
      const payload = JSON.parse(text);
      expect(payload.suggestion).toContain('Check the Actual Budget server logs');
    });
  });
});
