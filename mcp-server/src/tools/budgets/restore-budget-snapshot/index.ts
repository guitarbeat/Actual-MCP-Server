// ----------------------------
// RESTORE BUDGET SNAPSHOT TOOL
// ----------------------------

import fs from 'node:fs';
import path from 'node:path';
import { getDataDir } from '../create-budget-snapshot/index.js';
import { parseSnapshotDir } from '../list-budget-snapshots/index.js';
import { errorFromCatch, successWithJson } from '../../../core/response/index.js';

export const schema = {
  name: 'restore-budget-snapshot',
  description:
    'Restore the budget data directory from a previously created snapshot. This overwrites current budget data files with the snapshot contents.\n\n' +
    'REQUIRED:\n' +
    '- snapshotId: The snapshot identifier returned by create-budget-snapshot or list-budget-snapshots.\n\n' +
    'EXAMPLE:\n' +
    '- Restore snapshot: {"snapshotId": "1700000000000"}\n\n' +
    'WARNING: This will overwrite the current budget data. Create a snapshot of the current state first if needed.\n\n' +
    'SEE ALSO:\n' +
    '- Use list-budget-snapshots to find available snapshot IDs.\n' +
    '- Use create-budget-snapshot to save the current state before restoring.',
  inputSchema: {
    type: 'object',
    properties: {
      snapshotId: {
        type: 'string',
        description:
          'The snapshot identifier to restore. Use list-budget-snapshots to find available IDs.',
      },
    },
    required: ['snapshotId'],
  },
};

export interface RestoreResult {
  restored: true;
  snapshotId: string;
  restoredAt: string;
}

export async function handler(
  args: Record<string, unknown>,
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const { snapshotId } = args;

    if (!snapshotId || typeof snapshotId !== 'string') {
      return errorFromCatch('snapshotId is required and must be a string', {
        suggestion: 'Use list-budget-snapshots to find available snapshot IDs.',
      });
    }

    const dataDir = getDataDir();
    const snapshotsDir = path.join(dataDir, 'snapshots');

    if (!fs.existsSync(snapshotsDir)) {
      return errorFromCatch(`No snapshots directory found. No snapshots have been created yet.`, {
        suggestion: 'Use create-budget-snapshot to create a snapshot first.',
      });
    }

    // Find the snapshot directory that starts with the given snapshotId
    const entries = fs.readdirSync(snapshotsDir, { withFileTypes: true });
    let snapshotPath: string | undefined;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const parsed = parseSnapshotDir(entry.name, snapshotsDir);
      if (parsed && parsed.snapshotId === snapshotId) {
        snapshotPath = parsed.path;
        break;
      }
    }

    if (!snapshotPath || !fs.existsSync(snapshotPath)) {
      return errorFromCatch(`Snapshot with ID "${snapshotId}" not found.`, {
        suggestion: 'Use list-budget-snapshots to find available snapshot IDs.',
      });
    }

    // Copy snapshot contents back to the data directory (excluding snapshots subdir)
    const snapshotEntries = fs.readdirSync(snapshotPath);
    for (const entry of snapshotEntries) {
      if (entry === 'snapshots') continue;
      const srcEntry = path.join(snapshotPath, entry);
      const destEntry = path.join(dataDir, entry);
      fs.cpSync(srcEntry, destEntry, { recursive: true, force: true });
    }

    const result: RestoreResult = {
      restored: true,
      snapshotId,
      restoredAt: new Date().toISOString(),
    };

    return successWithJson(result);
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: 'Failed to restore budget snapshot',
      suggestion: 'Ensure the snapshot directory is accessible and the data directory is writable.',
    });
  }
}
