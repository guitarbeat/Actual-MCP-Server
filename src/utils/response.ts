// ----------------------------
// RESPONSE UTILITIES
// ----------------------------

import { CallToolResult, TextContent, ImageContent, AudioContent } from '@modelcontextprotocol/sdk/types.js';

interface ErrorPayload {
  error: true;
  message: string;
  suggestion: string;
}

const DEFAULT_SUGGESTION =
  'Check the Actual Budget server logs and verify the provided arguments before retrying.';

const suggestionMatchers: Array<{ test: RegExp; suggestion: string }> = [
  {
    test: /accountId/i,
    suggestion: 'Use the get-accounts tool to list available accounts and retry with a valid accountId.',
  },
  {
    test: /categoryId/i,
    suggestion: 'Use the get-grouped-categories tool to inspect valid category IDs before retrying.',
  },
  {
    test: /scheduleId/i,
    suggestion: 'Use the get-schedules tool to list existing schedules and reuse one of the returned IDs.',
  },
  {
    test: /payeeId|targetPayeeId|sourcePayeeIds/i,
    suggestion: 'Use the get-payees tool to list payees and supply their IDs as arguments.',
  },
  {
    test: /budgetId/i,
    suggestion: 'Use the get-budgets tool to review available budget IDs before retrying.',
  },
  {
    test: /month/i,
    suggestion: 'Use the get-budget-months tool and provide the month in YYYY-MM format (e.g., 2024-08).',
  },
  {
    test: /amount/i,
    suggestion:
      'Provide the amount as a number expressed in milliunits (e.g., 12500 for $125.00) to match Actual Budget expectations.',
  },
  {
    test: /nextDate/i,
    suggestion: 'Provide the date as an ISO string such as 2025-01-15.',
  },
  {
    test: /rule/i,
    suggestion:
      'Provide the recurrence rule identifier (e.g., "monthly"). Run get-schedules to review valid examples.',
  },
  {
    test: /filePath/i,
    suggestion: 'Ensure the provided file path is accessible to the server (e.g., /data/import.qif).',
  },
  {
    test: /enabled/i,
    suggestion: 'Provide true or false to toggle the carryover flag for the specified category.',
  },
  {
    test: /name/i,
    suggestion: 'Provide the name as descriptive text and reuse IDs from the relevant listing tool if needed.',
  },
  {
    test: /type/i,
    suggestion: 'Use one of the supported types noted in the error message or documentation for this tool.',
  },
  {
    test: /query/i,
    suggestion: 'Provide a SQL query string and review Actual Budget query documentation for syntax guidance.',
  },
];

/**
 * Standard MCP content item types (union of all supported content types)
 */
export type ContentItem = TextContent | ImageContent | AudioContent;

/**
 * Text content item (most common type)
 */
export type TextContentItem = TextContent;

/**
 * Standard MCP response structure (compatible with CallToolResult)
 */
export type Response = CallToolResult;

/**
 * Create a successful plain text response
 * @param text - The text message
 * @returns A success response object with text content
 */
export function success(text: string): CallToolResult {
  return {
    content: [{ type: 'text', text }],
  };
}

/**
 * Create a success response with structured content
 * @param content - Array of content items
 * @returns A success response object with provided content
 */
export function successWithContent(content: ContentItem): CallToolResult {
  return {
    content: [content],
  };
}

/**
 * Create a success response with JSON data
 * @param data - Any data object that can be JSON-stringified
 * @returns A success response with JSON data wrapped as a resource
 */
export function successWithJson<T>(data: T): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data),
      },
    ],
  };
}

/**
 * Create an error response
 * @param message - The error message
 * @returns An error response object
 */
export function error(message: string, suggestion: string): CallToolResult {
  const payload: ErrorPayload = {
    error: true,
    message,
    suggestion,
  };

  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload),
      },
    ],
    structuredContent: payload,
  };
}

/**
 * Create an error response from an Error object or any thrown value
 * @param err - The error object or value
 * @returns An error response object
 */
export interface ErrorContext {
  suggestion?: string;
  fallbackMessage?: string;
}

function inferSuggestion(message: string): string {
  const match = suggestionMatchers.find(({ test }) => test.test(message));
  return match?.suggestion ?? DEFAULT_SUGGESTION;
}

export function errorFromCatch(err: unknown, context: ErrorContext = {}): CallToolResult {
  const resolvedMessage =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : undefined;

  const message = resolvedMessage ?? context.fallbackMessage ?? 'Unknown error encountered';
  const suggestion = context.suggestion ?? inferSuggestion(message);

  return error(message, suggestion);
}
