import dotenv from 'dotenv';
import {
  applyAmazonAudit,
  resolveAmazonWorkspacePaths,
} from '../src/core/analysis/amazon-purchase-audit.js';

dotenv.config({ path: '.env', quiet: true });

async function main(): Promise<void> {
  const paths = resolveAmazonWorkspacePaths();
  const result = await applyAmazonAudit(paths);

  console.log('Amazon audit apply complete.');
  console.log(`Categories created: ${result.categoriesCreated.length}`);
  console.log(`Direct updates applied: ${result.directUpdatesApplied}`);
  console.log(`Split updates applied: ${result.splitUpdatesApplied}`);
  console.log(`Skipped already aligned: ${result.skippedAlreadyAligned}`);
  console.log(`Skipped missing transactions: ${result.skippedMissingTransactions}`);
  console.log(`Skipped changed transactions: ${result.skippedChangedTransactions}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Amazon apply failed: ${message}`);
  process.exitCode = 1;
});
