// ----------------------------
// RESPONSE UTILITIES
// Re-exports from core/response for backward compatibility
// ----------------------------

// Legacy type aliases for backward compatibility
import type { MCPResponse } from '../response/index.js';

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
} from '../response/index.js';
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
} from '../response/index.js';
export type Response = MCPResponse;
