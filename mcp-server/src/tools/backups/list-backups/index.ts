import { z } from 'zod';
import { executeToolAction } from '../../shared/tool-action.js';
import { success } from '../../../core/response/index.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ToolInput } from '../../../core/types/index.js';

export const schema = {
  name: 'list-backups',
  description: 'Returns a list of available backups with timestamps and sizes.',
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

        const backups = (await actualApi.internal.send('backups-get', { id: activeBudgetId })) as { id: string; date: string }[];

        // Enhance with size if possible
        const fs = await import('node:fs');
        const path = await import('node:path');
        const dataDir = process.env.ACTUAL_DATA_DIR || '';

        const enhancedBackups = await Promise.all(backups.map(async (b) => {
            let size = 0;
            try {
                if (dataDir) {
                   const filePath = path.join(dataDir, activeBudgetId, 'backups', b.id);
                   const stat = await fs.promises.stat(filePath);
                   size = stat.size;
                }
            } catch (e) {
                // Ignore
            }
            return { ...b, size };
        }));

        return {
          backups: enhancedBackups || [],
        };
      },
      buildResponse: (_, result) => success(result.backups.length ? result.backups.map((b: any) => `- ID: ${b.id}, Date: ${b.date}, Size: ${b.size} bytes`).join('\n') : 'No backups found.'),
      fallbackMessage: 'Failed to list budget backups.'
    });
}
