// ----------------------------
// SPECIALIZED ERROR BUILDERS
// ----------------------------

import { error } from './response-builder.js';
import type {
  ApiErrorOptions,
  MCPResponse,
  NotFoundErrorOptions,
  PermissionErrorOptions,
  UnsupportedFeatureOptions,
  ValidationErrorOptions,
} from './types.js';

/**
 * Create a validation error response with clear, actionable guidance
 * @param message - The validation error message
 * @param options - Additional context for the validation error
 * @returns A validation error response
 */
export function validationError(message: string, options: ValidationErrorOptions = {}): MCPResponse {
  const { field, value, expected } = options;

  let detailedMessage = message;
  if (field) {
    detailedMessage = `Validation failed for field '${field}': ${message}`;
  }
  if (value !== undefined) {
    const valueStr =
      typeof value === 'string' && value.length > 100 ? `${value.substring(0, 100)}...` : JSON.stringify(value);
    detailedMessage += ` (received: ${valueStr})`;
  }
  if (expected) {
    detailedMessage += ` (expected: ${expected})`;
  }

  // Provide more specific suggestions based on the field type
  let suggestion =
    'Review the tool documentation for valid input formats and ensure all required fields are provided correctly.';

  if (field) {
    if (field.toLowerCase().includes('id')) {
      suggestion = `The '${field}' field must be a valid UUID. Use the appropriate listing tool (e.g., get-accounts, get-categories) to find valid IDs.`;
    } else if (field.toLowerCase().includes('date')) {
      suggestion = `The '${field}' field must be in ISO date format (YYYY-MM-DD). Example: 2024-01-15`;
    } else if (field.toLowerCase().includes('amount')) {
      suggestion = `The '${field}' field must be a number in milliunits (e.g., 12500 for $125.00).`;
    } else if (field.toLowerCase().includes('month')) {
      suggestion = `The '${field}' field must be in YYYY-MM format. Example: 2024-08`;
    }
  }

  return error(detailedMessage, suggestion);
}

/**
 * Create a not found error response with specific guidance on how to find valid entities
 * @param entityType - The type of entity that was not found (e.g., 'Account', 'Category')
 * @param entityId - The ID of the entity that was not found
 * @param options - Additional options for the error
 * @returns A not found error response
 */
export function notFoundError(entityType: string, entityId: string, options: NotFoundErrorOptions = {}): MCPResponse {
  const message = `${entityType} with ID '${entityId}' not found`;

  // Provide specific tool suggestions based on entity type
  let defaultSuggestion = `Use the appropriate listing tool to verify the ${entityType.toLowerCase()} exists and retry with a valid ID.`;

  const entityTypeLower = entityType.toLowerCase();
  if (entityTypeLower.includes('account')) {
    defaultSuggestion = `Use the 'get-accounts' tool to list all available accounts and verify the account ID exists.`;
  } else if (entityTypeLower.includes('category')) {
    defaultSuggestion = `Use the 'get-grouped-categories' tool to list all categories and verify the category ID exists.`;
  } else if (entityTypeLower.includes('payee')) {
    defaultSuggestion = `Use the 'get-payees' tool to list all payees and verify the payee ID exists.`;
  } else if (entityTypeLower.includes('transaction')) {
    defaultSuggestion = `Use the 'get-transactions' tool to search for transactions and verify the transaction ID exists.`;
  } else if (entityTypeLower.includes('schedule')) {
    defaultSuggestion = `Use the 'get-schedules' tool to list all scheduled transactions and verify the schedule ID exists.`;
  } else if (entityTypeLower.includes('budget')) {
    defaultSuggestion = `Use the 'get-budgets' tool to list all available budgets and verify the budget ID exists.`;
  }

  const suggestion = options.suggestion ?? defaultSuggestion;

  return error(message, suggestion);
}

/**
 * Get troubleshooting suggestion based on error type
 * @param errorStr - Lowercase error message
 * @returns Specific troubleshooting suggestion
 */
function getTroubleshootingSuggestion(errorStr: string): string {
  if (errorStr.includes('connection') || errorStr.includes('econnrefused') || errorStr.includes('network')) {
    return 'Connection failed: Verify ACTUAL_SERVER_URL is correct and the Actual Budget server is running. Check network connectivity and firewall settings.';
  }
  if (errorStr.includes('auth') || errorStr.includes('password') || errorStr.includes('unauthorized')) {
    return 'Authentication failed: Verify ACTUAL_PASSWORD is correct and matches your Actual Budget server password. Check that the server requires authentication.';
  }
  if (errorStr.includes('timeout')) {
    return 'Request timed out: The Actual Budget server may be overloaded or unresponsive. Try again in a moment or check server performance.';
  }
  if (errorStr.includes('not found') || errorStr.includes('404')) {
    return 'Resource not found: The requested entity may have been deleted or the ID is invalid. Use listing tools to verify the resource exists.';
  }
  if (errorStr.includes('permission') || errorStr.includes('forbidden') || errorStr.includes('403')) {
    return 'Permission denied: This operation may require write access. Ensure the server is started with --enable-write flag if modifying data.';
  }
  return 'Verify the Actual Budget server is running and accessible. Check server logs for more details.';
}

/**
 * Build detailed error message with context
 * @param message - Base error message
 * @param errorDetails - Error details string
 * @param options - Additional context options
 * @returns Detailed error message
 */
function buildDetailedMessage(message: string, errorDetails: string, options: ApiErrorOptions): string {
  let detailedMessage = `${message}: ${errorDetails}`;

  if (options.operation) {
    detailedMessage = `API operation '${options.operation}' failed: ${errorDetails}`;
  }

  // Include additional context from options
  const contextKeys = Object.keys(options).filter((key) => key !== 'operation');
  if (contextKeys.length > 0) {
    const contextStr = contextKeys.map((key) => `${key}=${JSON.stringify(options[key])}`).join(', ');
    detailedMessage += ` (context: ${contextStr})`;
  }

  return detailedMessage;
}

/**
 * Create an API error response with detailed context and troubleshooting steps
 * @param message - The API error message
 * @param err - The original error object
 * @param options - Additional context for the API error
 * @returns An API error response
 */
export function apiError(message: string, err: unknown, options: ApiErrorOptions = {}): MCPResponse {
  const errorDetails = err instanceof Error ? err.message : String(err);
  const detailedMessage = buildDetailedMessage(message, errorDetails, options);
  const errorStr = errorDetails.toLowerCase();
  const suggestion = getTroubleshootingSuggestion(errorStr);

  return error(detailedMessage, suggestion);
}

/**
 * Create a permission error response with clear instructions on enabling write access
 * @param toolName - The name of the tool that requires permission
 * @param options - Additional options for the error
 * @returns A permission error response
 */
export function permissionError(toolName: string, options: PermissionErrorOptions = {}): MCPResponse {
  const reason = options.reason ?? 'Write access not enabled';
  const message = `Tool '${toolName}' requires write permission: ${reason}`;

  const defaultSuggestion =
    'Start the server with the --enable-write flag to enable write operations. ' +
    'Example: node build/index.js --enable-write (or set ENABLE_WRITE=true environment variable)';
  const suggestion = options.suggestion ?? defaultSuggestion;

  return error(message, suggestion);
}

/**
 * Create an error response when the Actual server lacks a required feature
 * @param feature - Human readable feature description (e.g., 'Creating schedules')
 * @param options - Additional options for the unsupported feature error
 * @returns An error response indicating the feature is unavailable
 */
export function unsupportedFeatureError(feature: string, options: UnsupportedFeatureOptions = {}): MCPResponse {
  const message = `${feature} is not supported by this Actual Budget server.`;
  const suggestion =
    options.suggestion ??
    'Update your Actual Budget server to a version that exposes this capability or manage it directly in the Actual app.';

  return error(message, suggestion);
}

/**
 * Create an error for a missing or invalid string argument
 * @param argName - The name of the argument
 * @param suggestion - A helpful suggestion
 * @returns An error response
 */
export function missingStringArgument(argName: string, suggestion: string): MCPResponse {
  return error(`${argName} is required and must be a string`, suggestion);
}

/**
 * Create an error for a missing or invalid number argument
 * @param argName - The name of the argument
 * @param suggestion - A helpful suggestion
 * @returns An error response
 */
export function missingNumberArgument(argName: string, suggestion: string): MCPResponse {
  return error(`${argName} is required and must be a number`, suggestion);
}

/**
 * Create an error for a missing or invalid boolean argument
 * @param argName - The name of the argument
 * @param suggestion - A helpful suggestion
 * @returns An error response
 */
export function missingBooleanArgument(argName: string, suggestion: string): MCPResponse {
  return error(`${argName} is required and must be a boolean`, suggestion);
}

/**
 * Create an error for a missing or invalid ISO month argument (YYYY-MM)
 * @param suggestion - A helpful suggestion
 * @returns An error response
 */
export function missingMonthArgument(suggestion: string): MCPResponse {
  return error('month is required and must be a string in YYYY-MM format', suggestion);
}

/**
 * Create an error for a missing array of strings argument
 * @param argName - The name of the argument
 * @param suggestion - A helpful suggestion
 * @returns An error response
 */
export function missingStringArrayArgument(argName: string, suggestion: string): MCPResponse {
  return error(`${argName} is required and must be an array of strings`, suggestion);
}

/**
 * Create an error when an array contains invalid non-string values
 * @param argName - The name of the argument
 * @param suggestion - A helpful suggestion
 * @returns An error response
 */
export function invalidStringArrayArgument(argName: string, suggestion: string): MCPResponse {
  return error(`All ${argName} must be strings`, suggestion);
}
