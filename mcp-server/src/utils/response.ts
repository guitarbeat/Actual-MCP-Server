// ----------------------------
// RESPONSE UTILITIES
// Re-exports from core/response for backward compatibility
// ----------------------------

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
} from '../core/response/index.js';
export {
  apiError,
  error,
  errorFromCatch,
  invalidStringArrayArgument,
  missingBooleanArgument,
  missingMonthArgument,
  missingNumberArgument,
  missingStringArgument,
  missingStringArrayArgument,
  notFoundError,
  permissionError,
  success,
  successWithContent,
  successWithJson,
  unsupportedFeatureError,
  validationError,
} from '../core/response/index.js';

// Legacy type aliases for backward compatibility
import type { MCPResponse } from '../core/response/index.js';
export type Response = MCPResponse;
