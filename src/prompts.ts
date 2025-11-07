import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { GetPromptRequestSchema, ListPromptsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

export const promptsSchema: never[] = [];

// ----------------------------
// PROMPTS
// ----------------------------

export const setupPrompts = (server: Server): void => {
  /**
   * Handler for listing available prompts
   */
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: promptsSchema,
    };
  });

  /**
   * Handler for getting prompts
   */
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    throw new Error(`Unknown prompt: ${request.params.name}`);
  });
};
