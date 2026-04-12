import { type MCPResponse, success } from '../../core/response/index.js';
import { executeToolAction } from './tool-action.js';

type CacheInvalidatingHandler = {
  invalidateCache(): void;
};

interface ExecuteMutationToolOptions<TArgs, THandler extends CacheInvalidatingHandler, TResult> {
  parse: (args: unknown) => TArgs;
  createHandler: () => THandler;
  execute: (handler: THandler, args: TArgs) => Promise<TResult>;
  successMessage: (args: TArgs, result: TResult) => string;
  fallbackMessage: string;
  suggestion?: string;
  allowMcpResponsePassthrough?: boolean;
  validate?: (args: TArgs) => MCPResponse | void;
}

export async function executeMutationTool<
  TArgs,
  THandler extends CacheInvalidatingHandler,
  TResult = void,
>(
  args: unknown,
  options: ExecuteMutationToolOptions<TArgs, THandler, TResult>,
): Promise<MCPResponse> {
  return executeToolAction(args, {
    parse: options.parse,
    validate: options.validate,
    execute: async (validated) => {
      const handler = options.createHandler();
      const result = await options.execute(handler, validated);
      handler.invalidateCache();
      return result;
    },
    buildResponse: (validated, result) => success(options.successMessage(validated, result)),
    fallbackMessage: options.fallbackMessage,
    suggestion: options.suggestion,
    allowMcpResponsePassthrough: options.allowMcpResponsePassthrough,
  });
}
