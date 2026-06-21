import dotenv from 'dotenv';
import { parseArgs } from 'node:util';
import {
  generateTimelineReconAudit,
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
  const audit = await generateTimelineReconAudit(paths, overrides);

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
