import dotenv from 'dotenv';
import {
  generateAmazonAudit,
  resolveAmazonWorkspacePaths,
} from '../src/core/analysis/amazon-purchase-audit.js';

dotenv.config({ path: '.env', quiet: true });

async function main(): Promise<void> {
  const paths = resolveAmazonWorkspacePaths();
  const audit = await generateAmazonAudit(paths);

  console.log(`Amazon audit complete for budget history starting ${audit.budgetStartDate}.`);
  console.log(
    `Matched ${audit.summary.autoMatchedTransactionCount} Amazon transactions ` +
      `(${audit.summary.directUpdateCount} direct, ${audit.summary.splitUpdateCount} split, ` +
      `${audit.summary.alreadyAlignedCount} already aligned).`,
  );
  console.log(`${audit.summary.manualReviewCount} transactions need manual review.`);
  console.log(`Audit file: ${paths.auditPath}`);
  console.log(`Links CSV: ${paths.linksPath}`);
  console.log(`Manual review CSV: ${paths.manualReviewPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Amazon audit failed: ${message}`);
  process.exitCode = 1;
});
