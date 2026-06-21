import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LOCATION_HISTORY_FILENAME,
  SUPPLEMENTAL_TRANSACTIONS_FILENAME,
  TIMELINE_CATEGORY_OVERRIDES_FILENAME,
  TIMELINE_PLACE_CACHE_FILENAME,
  TIMELINE_RECON_AUDIT_FILENAME,
  TIMELINE_RECON_CANDIDATES_FILENAME,
  TIMELINE_RECON_MANUAL_REVIEW_FILENAME,
} from './constants.js';
import type { TimelineReconPaths } from './types.js';
import { resolveLocalReconciliationPath } from '../local-reconciliation-workspace.js';

function repoRootFromModule(): string {
  return resolve(fileURLToPath(new URL('../../../../../', import.meta.url)));
}

export interface TimelineReconPathOverrides {
  supplementalCsvPath?: string;
  timelinePath?: string;
  startDate?: string;
  endDate?: string;
}

export function resolveTimelineReconPaths(
  repoRoot = repoRootFromModule(),
  overrides?: TimelineReconPathOverrides,
): TimelineReconPaths {
  const reconDir = resolveLocalReconciliationPath('timeline', repoRoot);

  let supplementalCsvPath: string;
  if (overrides?.supplementalCsvPath) {
    supplementalCsvPath = overrides.supplementalCsvPath;
  } else {
    // support "latest" by scanning for most recent *transactions*.csv
    const files = readdirSync(reconDir).filter((f) => f.includes('transactions') && f.endsWith('.csv'));
    if (files.length > 0) {
      files.sort().reverse(); // lexicographic on timestamped names works for recent-first
      supplementalCsvPath = resolve(reconDir, files[0]);
    } else {
      supplementalCsvPath = resolve(reconDir, SUPPLEMENTAL_TRANSACTIONS_FILENAME);
    }
  }

  return {
    repoRoot,
    reconDir,
    supplementalCsvPath,
    timelinePath: overrides?.timelinePath
      ? overrides.timelinePath
      : resolve(reconDir, LOCATION_HISTORY_FILENAME),
    auditPath: resolve(reconDir, TIMELINE_RECON_AUDIT_FILENAME),
    candidatesPath: resolve(reconDir, TIMELINE_RECON_CANDIDATES_FILENAME),
    manualReviewPath: resolve(reconDir, TIMELINE_RECON_MANUAL_REVIEW_FILENAME),
    placeCachePath: resolve(reconDir, TIMELINE_PLACE_CACHE_FILENAME),
    categoryOverridesPath: resolve(reconDir, TIMELINE_CATEGORY_OVERRIDES_FILENAME),
  };
}
