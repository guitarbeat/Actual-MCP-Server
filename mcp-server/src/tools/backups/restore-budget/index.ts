import { z } from 'zod';
import { executeToolAction } from '../../shared/tool-action.js';
import { success } from '../../../core/response/index.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ToolInput } from '../../../core/types/index.js';

export const schema = {
  name: 'restore-budget',
  description: 'Restores the budget from a specified backup ID.',
  inputSchema: zodToJsonSchema(z.object({
    backupId: z.string().describe('The ID of the backup to restore'),
    dryRun: z.boolean().default(true).describe('If true, simulates the operation to ask for confirmation before modifying the budget.'),
  })) as ToolInput,
};

export async function handler(args: unknown) {
    return executeToolAction(args, {
      parse: (input: unknown) => {
        return z.object({
            backupId: z.string(),
            dryRun: z.boolean().default(true),
        }).parse(input);
      },
      execute: async (validated) => {
        const { getConnectionState } = await import('../../../core/api/actual-client.js');
        const activeBudgetId = getConnectionState().activeBudgetId;
        if (!activeBudgetId) {
          throw new Error('No active budget loaded.');
        }

        const actualApi = (await import('@actual-app/api')).default;
        if (!actualApi.internal?.send) {
          throw new Error('internal.send is not available on this Actual API client');
        }

        if (validated.dryRun) {
           return {
             dryRun: true,
             backupId: validated.backupId,
           };
        }

        await actualApi.internal.send('backup-load', { id: activeBudgetId, backupId: validated.backupId });

        return {
          dryRun: false,
          backupId: validated.backupId,
        };
      },
      buildResponse: (_, result) => {
          if (result.dryRun) {
             return success(`Dry run: Ready to restore backup '${result.backupId}'. Call this tool again with dryRun=false to confirm and proceed.`);
          }
          return success(`Successfully restored backup '${result.backupId}'.`);
      },
      fallbackMessage: 'Failed to restore budget backup.'
    });
}
