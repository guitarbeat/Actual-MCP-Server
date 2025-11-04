// ----------------------------
// TOOL ERROR BUILDERS
// ----------------------------

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { error } from './response.js';

/**
 * Create an error for a missing or invalid string argument.
 */
export function missingStringArgument(argName: string, suggestion: string): CallToolResult {
  return error(`${argName} is required and must be a string`, suggestion);
}

/**
 * Create an error for a missing or invalid number argument.
 */
export function missingNumberArgument(argName: string, suggestion: string): CallToolResult {
  return error(`${argName} is required and must be a number`, suggestion);
}

/**
 * Create an error for a missing or invalid boolean argument.
 */
export function missingBooleanArgument(argName: string, suggestion: string): CallToolResult {
  return error(`${argName} is required and must be a boolean`, suggestion);
}

/**
 * Create an error for a missing or invalid ISO month argument (YYYY-MM).
 */
export function missingMonthArgument(suggestion: string): CallToolResult {
  return error('month is required and must be a string in YYYY-MM format', suggestion);
}

/**
 * Create an error for a missing array of strings argument.
 */
export function missingStringArrayArgument(argName: string, suggestion: string): CallToolResult {
  return error(`${argName} is required and must be an array of strings`, suggestion);
}

/**
 * Create an error when an array contains invalid non-string values.
 */
export function invalidStringArrayArgument(argName: string, suggestion: string): CallToolResult {
  return error(`All ${argName} must be strings`, suggestion);
}
