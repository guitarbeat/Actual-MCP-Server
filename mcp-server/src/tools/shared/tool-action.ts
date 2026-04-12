import {
  errorFromCatch,
  isMCPResponse,
  type ErrorContext,
  type MCPResponse,
} from '../../core/response/index.js';

interface ExecuteToolActionOptions<TArgs, TResult> {
  parse: (args: unknown) => TArgs;
  execute: (args: TArgs) => Promise<TResult>;
  buildResponse: (args: TArgs, result: TResult) => MCPResponse;
  fallbackMessage: string;
  suggestion?: string;
  allowMcpResponsePassthrough?: boolean;
  validate?: (args: TArgs) => MCPResponse | void;
  errorContext?: Omit<ErrorContext, 'fallbackMessage' | 'suggestion'>;
}

export async function executeToolAction<TArgs, TResult>(
  args: unknown,
  options: ExecuteToolActionOptions<TArgs, TResult>,
): Promise<MCPResponse> {
  try {
    const validated = options.parse(args);
    const validationResponse = options.validate?.(validated);

    if (validationResponse) {
      return validationResponse;
    }

    const result = await options.execute(validated);
    return options.buildResponse(validated, result);
  } catch (error) {
    if (options.allowMcpResponsePassthrough && isMCPResponse(error)) {
      return error;
    }

    return errorFromCatch(error, {
      ...options.errorContext,
      fallbackMessage: options.fallbackMessage,
      suggestion: options.suggestion,
    });
  }
}
