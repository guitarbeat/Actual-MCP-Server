// ----------------------------
// CORE RESPONSE MODULE
// Barrel export for response builders and types
// ----------------------------

// Types
export type {
  ApiErrorOptions,
  ContentItem,
  ErrorContext,
  ErrorPayload,
  MCPResponse,
  NotFoundErrorOptions,
  PermissionErrorOptions,
  TextContentItem,
  ValidationErrorOptions,
} from '../types/index.js';
// Specialized error builders
export {
  apiError,
  invalidStringArrayArgument,
  missingBooleanArgument,
  missingMonthArgument,
  missingNumberArgument,
  missingStringArgument,
  missingStringArrayArgument,
  notFoundError,
  permissionError,
  unsupportedFeatureError,
  validationError,
} from './error-builder.js';
// Response builders
export {
  error,
  errorFromCatch,
  success,
  successWithContent,
  successWithJson,
} from './response-builder.js';
