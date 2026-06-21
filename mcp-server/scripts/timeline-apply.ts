import dotenv from 'dotenv';
import { parseArgs } from 'node:util';
import {
  applyTimelineReconAudit,
  resolveTimelineReconPaths,
} from '../src/core/analysis/timeline-reconciliation.js';

dotenv.config({ path: '.env', quiet: true });

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      supplemental: { type: 'string' },
      start: { type: 'string' },
      end: { type: 'string' },
    },
  });

  const overrides = {
    supplementalCsvPath: values.supplemental,
    startDate: values.start,
    endDate: values.end,
  };

  const paths = resolveTimelineReconPaths(undefined, overrides);
  const result = await applyTimelineReconAudit(paths, overrides);

  console.log('Timeline reconciliation apply complete.');
  console.log(`Exact updates applied: ${result.exactUpdatesApplied}`);
  console.log(`Confirmed updates applied: ${result.confirmedUpdatesApplied}`);
  console.log(`Skipped missing transactions: ${result.skippedMissingTransactions}`);
  console.log(`Skipped changed transactions: ${result.skippedChangedTransactions}`);
  console.log(`Skipped manual candidates: ${result.skippedManualCandidates}`);
  console.log(`Rules created: ${result.rulesCreated.length}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Timeline apply failed: ${message}`);
  process.exitCode = 1;
});
