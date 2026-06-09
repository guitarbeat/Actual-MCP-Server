// ----------------------------
// CREATE BUDGET SNAPSHOT TOOL
// ----------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { errorFromCatch, successWithJson } from '../../../core/response/index.js';

export const DEFAULT_DATA_DIR: string = path.resolve(os.homedir() || '.', '.actual');

export function getDataDir(): string {
  return process.env.ACTUAL_DATA_DIR || DEFAULT_DATA_DIR;
}

export function buildSnapshotId(timestamp: number): string {
  return String(timestamp);
}

export const schema = {
  name: 'create-budget-snapshot',
  description:
    'Create a point-in-time backup snapshot of the budget data directory. Use this before risky operations such as bulk imports or applying budget plans.\n\n' +
    'OPTIONAL:\n' +
    '- snapshotName: A human-readable label for the snapshot (e.g., "before-import").\n\n' +
    'EXAMPLE:\n' +
    '- Create unnamed snapshot: {}\n' +
    '- Create named snapshot: {"snapshotName": "before-import"}\n\n' +
    'RETURNS: Snapshot metadata including snapshotId, snapshotName, createdAt, and path.',
  inputSchema: {
    type: 'object',
    properties: {
      snapshotName: {
        type: 'string',
        description: 'Optional human-readable label for the snapshot (e.g., "before-import").',
      },
    },
    required: [],
  },
};

export interface SnapshotMetadata {
  snapshotId: string;
  snapshotName: string;
  createdAt: string;
  path: string;
}

export async function handler(
  args: Record<string, unknown>,
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const snapshotName =
      args.snapshotName && typeof args.snapshotName === 'string'
        ? args.snapshotName.trim()
        : 'snapshot';

    const dataDir = getDataDir();
    const snapshotsDir = path.join(dataDir, 'snapshots');

    if (!fs.existsSync(snapshotsDir)) {
      fs.mkdirSync(snapshotsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const snapshotId = buildSnapshotId(timestamp);
    const safeName = snapshotName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const snapshotDirName = `${snapshotId}-${safeName}`;
    const snapshotPath = path.join(snapshotsDir, snapshotDirName);

    // Copy data dir contents (excluding the snapshots subdirectory itself)
    fs.mkdirSync(snapshotPath, { recursive: true });

    const entries = fs.readdirSync(dataDir);
    for (const entry of entries) {
      if (entry === 'snapshots') continue;
      const srcEntry = path.join(dataDir, entry);
      const destEntry = path.join(snapshotPath, entry);
      fs.cpSync(srcEntry, destEntry, { recursive: true });
    }

    const createdAt = new Date(timestamp).toISOString();

    const metadata: SnapshotMetadata = {
      snapshotId,
      snapshotName,
      createdAt,
      path: snapshotPath,
    };

    return successWithJson(metadata);
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: 'Failed to create budget snapshot',
      suggestion: 'Ensure the data directory is accessible and the server has write permissions.',
    });
  }
}
