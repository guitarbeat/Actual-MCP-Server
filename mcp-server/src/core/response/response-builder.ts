// ----------------------------
// RESPONSE BUILDER
// ----------------------------

import type { ContentItem, ErrorContext, ErrorPayload, MCPResponse } from '../types/index.js';

/**
 * Default error suggestion when no specific suggestion can be inferred
 */
const DEFAULT_SUGGESTION = 'Check the Actual Budget server logs and verify the provided arguments before retrying.';

/**
 * Log level prefix for error messages
 */
const ERROR_LOG_PREFIX = '[ERROR]';

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
    suggestion:
      'Use the get-budget tool to list available months, then provide the month in YYYY-MM format (e.g., 2024-08).',
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
    suggestion: 'Provide the recurrence rule identifier (e.g., "monthly"). Run get-schedules to review valid examples.',
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
 * Infer a helpful suggestion based on the error message.
 * Matches error messages against known patterns to provide contextual suggestions.
 *
 * @param message - The error message to analyze
 * @returns A contextual suggestion if a pattern matches, otherwise the default suggestion
 */
function inferSuggestion(message: string): string {
  const match = suggestionMatchers.find(({ test }) => test.test(message));
  return match?.suggestion ?? DEFAULT_SUGGESTION;
}

/**
 * Create a successful plain text response.
 *
 * @param text - The text message to include in the response
 * @returns A success response object with text content
 */
export function success(text: string): MCPResponse {
  return {
    content: [{ type: 'text', text }],
  };
}

/**
 * Create a success response with structured content.
 *
 * @param content - A content item (text, image, audio, etc.)
 * @returns A success response object with the provided content
 */
export function successWithContent(content: ContentItem): MCPResponse {
  return {
    content: [content],
  };
}

/**
 * Create a success response with JSON data.
 * Serializes the provided data to JSON and wraps it in a text content item.
 *
 * @param data - Any data object that can be JSON-stringified
 * @returns A success response with JSON data wrapped as text content
 */
export function successWithJson<T>(data: T): MCPResponse {
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
 * Create an error response with a message and suggestion.
 *
 * @param message - The error message describing what went wrong
 * @param suggestion - A helpful suggestion for resolving the error
 * @returns An error response object with structured error payload
 */
export function error(message: string, suggestion: string): MCPResponse {
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
  } as MCPResponse;
}

/**
 * Create an error response from an Error object or any thrown value.
 * Extracts error messages, infers helpful suggestions, and logs error context
 * for debugging purposes.
 *
 * @param err - The error object or value that was thrown
 * @param context - Optional context for error handling (operation, tool, args)
 * @returns An error response object with message and suggestion
 */
export function errorFromCatch(err: unknown, context: ErrorContext = {}): MCPResponse {
  let resolvedMessage: string | undefined;

  try {
    if (err instanceof Error) {
      resolvedMessage = err.message || 'Unknown error';
    } else if (typeof err === 'string') {
      resolvedMessage = err;
    } else if (err === null || err === undefined) {
      // For null/undefined, use fallback message if provided, otherwise use string representation
      resolvedMessage = undefined; // Will fall back to context.fallbackMessage
    } else {
      // Try to extract message from object, but handle non-serializable objects
      try {
        const stringified = JSON.stringify(err);
        // If it's an object with a message property, use that
        if (typeof err === 'object' && err !== null && 'message' in err) {
          resolvedMessage = String((err as { message: unknown }).message);
        } else {
          resolvedMessage = stringified;
        }
      } catch {
        // If JSON.stringify fails (circular reference, etc.), use String conversion
        resolvedMessage = String(err);
      }
    }
  } catch {
    // Fallback if anything goes wrong
    resolvedMessage = 'Unknown error (could not process error object)';
  }

  const message = resolvedMessage ?? context.fallbackMessage ?? 'Unknown error encountered';
  const suggestion = context.suggestion ?? inferSuggestion(message);

  // Log error with context for debugging
  logErrorWithContext(err, context);

  return error(message, suggestion);
}

/**
 * Log error with relevant context for troubleshooting.
 * Formats error messages and includes operation context for easier debugging.
 *
 * @param err - The error object or value that was thrown
 * @param context - Error context including operation, tool, and args
 */
function logErrorWithContext(err: unknown, context: ErrorContext): void {
  const timestamp = new Date().toISOString();
  let errorMessage: string;
  let errorStack: string | undefined;

  try {
    if (err instanceof Error) {
      errorMessage = err.message || 'Unknown error';
      errorStack = err.stack;
    } else if (typeof err === 'string') {
      errorMessage = err;
    } else if (err === null || err === undefined) {
      errorMessage = String(err);
    } else {
      // Try to stringify, but catch circular reference errors
      try {
        errorMessage = JSON.stringify(err);
      } catch {
        errorMessage = String(err);
      }
    }
  } catch {
    errorMessage = 'Unknown error (could not serialize)';
  }

  // Build context string with all available information
  const contextParts: string[] = [];
  if (context.operation) contextParts.push(`operation=${context.operation}`);
  if (context.tool) contextParts.push(`tool=${context.tool}`);
  if (context.args) {
    try {
      contextParts.push(`args=${JSON.stringify(context.args)}`);
    } catch {
      contextParts.push(`args=[non-serializable]`);
    }
  }

  const contextStr = contextParts.length > 0 ? ` [${contextParts.join(', ')}]` : '';

  console.error(`${ERROR_LOG_PREFIX} ${timestamp}${contextStr}: ${errorMessage}`);

  // Include stack trace for Error objects to aid debugging
  if (errorStack && process.env.NODE_ENV !== 'production') {
    console.error(`${ERROR_LOG_PREFIX} Stack trace:\n${errorStack}`);
  }
}
