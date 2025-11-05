// ----------------------------
// RESPONSE TYPE DEFINITIONS
// Type definitions for MCP responses and error handling
// ----------------------------

import { CallToolResult, TextContent, ImageContent, AudioContent } from '@modelcontextprotocol/sdk/types.js';

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
export type MCPResponse = CallToolResult;

/**
 * Error payload structure for error responses
 */
export interface ErrorPayload {
  error: true;
  message: string;
  suggestion: string;
}

/**
 * Context for error handling with debugging information
 */
export interface ErrorContext {
  /** Custom suggestion to override the inferred suggestion */
  suggestion?: string;
  /** Fallback message if error cannot be parsed */
  fallbackMessage?: string;
  /** The tool name where the error occurred */
  tool?: string;
  /** The operation being performed when the error occurred */
  operation?: string;
  /** The arguments passed to the tool/operation */
  args?: unknown;
}

/**
 * Options for validation errors
 */
export interface ValidationErrorOptions {
  field?: string;
  value?: unknown;
  expected?: string;
}

/**
 * Options for not found errors
 */
export interface NotFoundErrorOptions {
  suggestion?: string;
}

/**
 * Options for API errors
 */
export interface ApiErrorOptions {
  operation?: string;
  [key: string]: unknown;
}

/**
 * Options for permission errors
 */
export interface PermissionErrorOptions {
  reason?: string;
  suggestion?: string;
}
