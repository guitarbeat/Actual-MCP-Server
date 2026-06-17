import { z } from 'zod';
import { executeToolAction } from '../../shared/tool-action.js';
import { success } from '../../../core/response/index.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ToolInput } from '../../../core/types/index.js';

export const schema = {
  name: 'backup-budget',
  description: 'Creates a backup or snapshot of the currently loaded budget.',
  inputSchema: zodToJsonSchema(z.object({})) as ToolInput,
};

export async function handler(args: unknown) {
    return executeToolAction(args, {
      parse: () => ({}),
      execute: async () => {
        const { getConnectionState } = await import('../../../core/api/actual-client.js');
        const activeBudgetId = getConnectionState().activeBudgetId;
        if (!activeBudgetId) {
          throw new Error('No active budget loaded.');
        }

        const actualApi = (await import('@actual-app/api')).default;
        if (!actualApi.internal?.send) {
          throw new Error('internal.send is not available on this Actual API client');
        }

        await actualApi.internal.send('backup-make', { id: activeBudgetId });

        const backups = (await actualApi.internal.send('backups-get', { id: activeBudgetId })) as { id: string; date: string }[];
        if (!backups || backups.length === 0) {
          throw new Error('Backup creation reported success, but could not list the newly created backup.');
        }

        const latestBackup = backups.reduce((latest: { id: string; date: string } | null, current) => {
          return latest && new Date(latest.date) > new Date(current.date) ? latest : current;
        }, null);

        return {
          backupId: latestBackup?.id,
          date: latestBackup?.date,
        };
      },
      buildResponse: (_, result) => success(`Backup created successfully:\nID: ${result.backupId}\nDate: ${result.date}`),
      fallbackMessage: 'Failed to create budget backup.'
    });
}
