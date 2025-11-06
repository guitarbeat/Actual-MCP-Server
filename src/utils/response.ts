// ----------------------------
// RESPONSE UTILITIES
// Re-exports from core/response for backward compatibility
// ----------------------------

export {
  success,
  successWithContent,
  successWithJson,
  error,
  errorFromCatch,
  validationError,
  notFoundError,
  apiError,
  permissionError,
  unsupportedFeatureError,
  missingStringArgument,
  missingNumberArgument,
  missingBooleanArgument,
  missingMonthArgument,
  missingStringArrayArgument,
  invalidStringArrayArgument,
} from '../core/response/index.js';

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
} from '../core/response/index.js';

// Legacy type aliases for backward compatibility
import type { MCPResponse } from '../core/response/index.js';
export type Response = MCPResponse;
