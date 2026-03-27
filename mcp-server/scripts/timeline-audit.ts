import dotenv from 'dotenv';
import {
  generateTimelineReconAudit,
  resolveTimelineReconPaths,
} from '../src/core/analysis/timeline-reconciliation.js';

dotenv.config({ path: '.env', quiet: true });

async function main(): Promise<void> {
  const paths = resolveTimelineReconPaths();
  const audit = await generateTimelineReconAudit(paths);

  console.log(
    `Timeline reconciliation audit complete for ${audit.startDate} through ${audit.endDate}.`,
  );
  console.log(`Uncategorized analyzed: ${audit.summary.totalUncategorizedTransactions}`);
  console.log(`Location-eligible: ${audit.summary.locationEligibleTransactions}`);
  console.log(`Ready exact: ${audit.summary.exactReadyCount}`);
  console.log(`Ready confirmed: ${audit.summary.confirmedReadyCount}`);
  console.log(`Manual review: ${audit.summary.manualCount}`);
  console.log(`Audit file: ${paths.auditPath}`);
  console.log(`Candidates CSV: ${paths.candidatesPath}`);
  console.log(`Manual review CSV: ${paths.manualReviewPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Timeline audit failed: ${message}`);
  process.exitCode = 1;
});
