import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { ZodError, ZodIssue } from 'zod';
import type { TextContent, ImageContent } from '@modelcontextprotocol/sdk/types.js';
import {
  error,
  errorFromCatch,
  success,
  successWithContent,
  successWithJson,
} from './response-builder.js';

// Helper to extract text payload from a TextContent response
function getPayload(result: { content: Array<{ type: string; text?: string }> }): unknown {
  const textContent = result.content[0] as TextContent;
  return JSON.parse(textContent.text);
}

describe('Response Builder', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('success', () => {
    it('should create a plain text success response', () => {
      const result = success('Operation completed successfully');

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);

      const content = result.content[0] as TextContent;
      expect(content.type).toBe('text');
      expect(content.text).toBe('Operation completed successfully');
    });
  });

  describe('successWithContent', () => {
    it('should create a success response with structured content', () => {
      const imageContent: ImageContent = {
        type: 'image',
        data: 'base64data',
        mimeType: 'image/png',
      };

      const result = successWithContent(imageContent);

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);

      const content = result.content[0] as ImageContent;
      expect(content.type).toBe('image');
      expect(content.data).toBe('base64data');
      expect(content.mimeType).toBe('image/png');
    });
  });

  describe('successWithJson', () => {
    it('should serialize data to JSON and wrap it in text content', () => {
      const data = { id: 1, name: 'Test' };
      const result = successWithJson(data);

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);

      const content = result.content[0] as TextContent;
      expect(content.type).toBe('text');
      expect(JSON.parse(content.text)).toEqual(data);
    });

    it('should handle arrays', () => {
      const data = [1, 2, 3];
      const result = successWithJson(data);

      const content = result.content[0] as TextContent;
      expect(JSON.parse(content.text)).toEqual(data);
    });
  });

  describe('error', () => {
    it('should create an error response with message and suggestion', () => {
      const result = error('Something went wrong', 'Try again later');

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);

      const payload = getPayload(result) as { error: boolean; message: string; suggestion: string };
      expect(payload.error).toBe(true);
      expect(payload.message).toBe('Something went wrong');
      expect(payload.suggestion).toBe('Try again later');
    });
  });

  describe('errorFromCatch', () => {
    it('should extract messages from ZodError', () => {
      // Mock console.error to avoid test output noise
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const issues: ZodIssue[] = [
        { code: 'custom', path: ['user', 'name'], message: 'Name is required' },
        { code: 'custom', path: ['age'], message: 'Age must be a number' },
        { code: 'custom', path: [], message: 'General error' },
      ];
      const zodError = new ZodError(issues);

      const result = errorFromCatch(zodError);

      const payload = getPayload(result) as { error: boolean; message: string; suggestion: string };
      expect(payload.message).toBe(
        'Validation error: user.name: Name is required; age: Age must be a number; General error',
      );
    });

    it('should extract message from standard Error', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const err = new Error('Standard error message');

      const result = errorFromCatch(err);

      const payload = getPayload(result) as { error: boolean; message: string; suggestion: string };
      expect(payload.message).toBe('Standard error message');
    });

    it('should handle string errors directly', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = errorFromCatch('A string error');

      const payload = getPayload(result) as { error: boolean; message: string; suggestion: string };
      expect(payload.message).toBe('A string error');
    });

    it('should extract message property from plain objects', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const err = { message: 'Object error message', code: 500 };

      const result = errorFromCatch(err);

      const payload = getPayload(result) as { error: boolean; message: string; suggestion: string };
      expect(payload.message).toBe('Object error message');
    });

    it('should fallback to JSON serialization for objects without message', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const err = { foo: 'bar' };

      const result = errorFromCatch(err);

      const payload = getPayload(result) as { error: boolean; message: string; suggestion: string };
      expect(payload.message).toBe('{"foo":"bar"}');
    });

    it('should use fallback message for null or undefined', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const result1 = errorFromCatch(null, { fallbackMessage: 'Custom fallback' });
      expect((getPayload(result1) as { message: string }).message).toBe('Custom fallback');

      const result2 = errorFromCatch(undefined);
      expect((getPayload(result2) as { message: string }).message).toBe(
        'Unknown error encountered',
      );
    });

    it('should log error with context to console.error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const err = new Error('Test log');

      errorFromCatch(err, {
        operation: 'testOp',
        tool: 'testTool',
        args: { id: 1 },
      });

      expect(consoleSpy).toHaveBeenCalled();
      const logMessage = consoleSpy.mock.calls[0][0] as string;
      expect(logMessage).toContain('[ERROR]');
      expect(logMessage).toContain('operation=testOp');
      expect(logMessage).toContain('tool=testTool');
      expect(logMessage).toContain('args={"id":1}');
      expect(logMessage).toContain('Test log');
    });

    describe('suggestion inference', () => {
      beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
      });

      it('should infer suggestion for accountId errors', () => {
        const result = errorFromCatch('Invalid accountId provided');
        expect((getPayload(result) as { suggestion: string }).suggestion).toContain(
          'get-accounts tool to list available accounts',
        );
      });

      it('should infer suggestion for categoryId errors', () => {
        const result = errorFromCatch('categoryId not found');
        expect((getPayload(result) as { suggestion: string }).suggestion).toContain(
          'get-grouped-categories tool to inspect',
        );
      });

      it('should infer suggestion for scheduleId errors', () => {
        const result = errorFromCatch('scheduleId is missing');
        expect((getPayload(result) as { suggestion: string }).suggestion).toContain(
          'get-schedules tool to list existing schedules',
        );
      });

      it('should infer suggestion for payeeId errors', () => {
        const result = errorFromCatch('Invalid payeeId');
        expect((getPayload(result) as { suggestion: string }).suggestion).toContain(
          'get-payees tool to list payees',
        );
      });

      it('should infer suggestion for budgetId errors', () => {
        const result = errorFromCatch('budgetId must be valid');
        expect((getPayload(result) as { suggestion: string }).suggestion).toContain(
          'get-budgets tool to review available',
        );
      });

      it('should infer suggestion for month errors', () => {
        const result = errorFromCatch('Invalid month format');
        expect((getPayload(result) as { suggestion: string }).suggestion).toContain(
          'get-budget tool to list available months',
        );
      });

      it('should infer suggestion for amount errors', () => {
        const result = errorFromCatch('amount must be a number');
        expect((getPayload(result) as { suggestion: string }).suggestion).toContain(
          'milliunits (e.g., 12500 for $125.00)',
        );
      });

      it('should infer suggestion for nextDate errors', () => {
        const result = errorFromCatch('nextDate is required');
        expect((getPayload(result) as { suggestion: string }).suggestion).toContain(
          'ISO string such as 2025-01-15',
        );
      });

      it('should infer suggestion for rule errors', () => {
        const result = errorFromCatch('Invalid rule');
        expect((getPayload(result) as { suggestion: string }).suggestion).toContain(
          'recurrence rule identifier',
        );
      });

      it('should infer suggestion for filePath errors', () => {
        const result = errorFromCatch('filePath does not exist');
        expect((getPayload(result) as { suggestion: string }).suggestion).toContain(
          'accessible to the server',
        );
      });

      it('should infer suggestion for enabled errors', () => {
        const result = errorFromCatch('enabled flag is wrong');
        expect((getPayload(result) as { suggestion: string }).suggestion).toContain(
          'Provide true or false to toggle',
        );
      });

      it('should infer suggestion for name errors', () => {
        const result = errorFromCatch('name is too short');
        expect((getPayload(result) as { suggestion: string }).suggestion).toContain(
          'descriptive text and reuse IDs',
        );
      });

      it('should infer suggestion for type errors', () => {
        const result = errorFromCatch('Unknown type');
        expect((getPayload(result) as { suggestion: string }).suggestion).toContain(
          'supported types noted in the error',
        );
      });

      it('should infer suggestion for query errors', () => {
        const result = errorFromCatch('SQL query failed');
        expect((getPayload(result) as { suggestion: string }).suggestion).toContain(
          'SQL query string and review Actual Budget query documentation',
        );
      });

      it('should use default suggestion if no pattern matches', () => {
        const result = errorFromCatch('Something completely different went wrong');
        expect((getPayload(result) as { suggestion: string }).suggestion).toContain(
          'Check the Actual Budget server logs',
        );
      });

      it('should prioritize explicit suggestion in context over inferred one', () => {
        const result = errorFromCatch('Invalid accountId', {
          suggestion: 'Explicitly telling you what to do',
        });
        expect((getPayload(result) as { suggestion: string }).suggestion).toBe(
          'Explicitly telling you what to do',
        );
      });
    });
  });
});
