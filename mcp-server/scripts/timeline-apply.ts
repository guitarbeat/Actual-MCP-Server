import dotenv from 'dotenv';
import {
  applyTimelineReconAudit,
  resolveTimelineReconPaths,
} from '../src/core/analysis/timeline-reconciliation.js';

dotenv.config({ path: '.env', quiet: true });

async function main(): Promise<void> {
  const paths = resolveTimelineReconPaths();
  const result = await applyTimelineReconAudit(paths);

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
