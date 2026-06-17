// ----------------------------
// LIST BUDGET SNAPSHOTS TOOL
// ----------------------------

import fs from 'node:fs';
import path from 'node:path';
import { getDataDir, type SnapshotMetadata } from '../create-budget-snapshot/index.js';
import { errorFromCatch, successWithJson } from '../../../core/response/index.js';

export const schema = {
  name: 'list-budget-snapshots',
  description:
    'List all available budget snapshots sorted by creation time (most recent first). Use this to find a snapshotId before restoring.\n\n' +
    'EXAMPLE:\n' +
    '- List all snapshots: {}\n\n' +
    'RETURNS: Array of snapshot objects each containing snapshotId, snapshotName, createdAt, and path.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export interface ListSnapshotsResult {
  snapshots: SnapshotMetadata[];
}

export function parseSnapshotDir(
  dirName: string,
  snapshotsDir: string,
): SnapshotMetadata | undefined {
  const dashIndex = dirName.indexOf('-');
  if (dashIndex === -1) return undefined;

  const idPart = dirName.slice(0, dashIndex);
  const namePart = dirName.slice(dashIndex + 1);
  const timestamp = Number(idPart);

  if (!Number.isFinite(timestamp) || timestamp <= 0) return undefined;

  return {
    snapshotId: idPart,
    snapshotName: namePart.replace(/_/g, ' '),
    createdAt: new Date(timestamp).toISOString(),
    path: path.join(snapshotsDir, dirName),
  };
}

export async function handler(
  _args: Record<string, unknown>,
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const dataDir = getDataDir();
    const snapshotsDir = path.join(dataDir, 'snapshots');

    if (!fs.existsSync(snapshotsDir)) {
      return successWithJson<ListSnapshotsResult>({ snapshots: [] });
    }

    const entries = fs.readdirSync(snapshotsDir, { withFileTypes: true });
    const snapshots: SnapshotMetadata[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const parsed = parseSnapshotDir(entry.name, snapshotsDir);
      if (parsed) {
        snapshots.push(parsed);
      }
    }

    // Sort by creation time descending (most recent first)
    snapshots.sort((a, b) => Number(b.snapshotId) - Number(a.snapshotId));

    return successWithJson<ListSnapshotsResult>({ snapshots });
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: 'Failed to list budget snapshots',
      suggestion: 'Ensure the data directory is accessible.',
    });
  }
}
