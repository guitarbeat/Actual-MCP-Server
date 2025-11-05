// ----------------------------
// CORE RESPONSE MODULE
// Barrel export for response builders and types
// ----------------------------

// Response builders
export { success, successWithContent, successWithJson, error, errorFromCatch } from './response-builder.js';

// Specialized error builders
export {
  validationError,
  notFoundError,
  apiError,
  permissionError,
  missingStringArgument,
  missingNumberArgument,
  missingBooleanArgument,
  missingMonthArgument,
  missingStringArrayArgument,
  invalidStringArrayArgument,
} from './error-builder.js';

// Types
export type {
  MCPResponse,
  ContentItem,
  TextContentItem,
  ErrorPayload,
  ErrorContext,
  ValidationErrorOptions,
  NotFoundErrorOptions,
  ApiErrorOptions,
  PermissionErrorOptions,
} from './types.js';
