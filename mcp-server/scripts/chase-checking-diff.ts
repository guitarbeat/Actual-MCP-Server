/**
 * Multiset diff Chase checking CSV vs get-transactions JSON (outputFormat=json).
 *
 *    pnpm exec tsx scripts/chase-checking-diff.ts \
 *      --csv ../imports/chase-checking_through_2026-05-07.csv \
 *      --actual-json ./chase-from-mcp.json [--start …] [--end …]
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  type ActualTxn,
  computeChaseDiff,
  filterActualForDiff,
  parseCsv,
} from './chase-diff-lib.js';

interface CliOpts {
  csvPath: string;
  actualJsonPath: string;
  start: string;
  end: string;
}

interface JsonPayload {
  ok?: boolean;
  transactions?: ActualTxn[];
}

function usage(): never {
  console.error(
    `Usage: tsx scripts/chase-checking-diff.ts --csv PATH --actual-json PATH [--start YYYY-MM-DD] [--end YYYY-MM-DD]`,
  );
  process.exit(1);
}

function parseArgs(argv: string[]): CliOpts {
  let csvPath: string | undefined;
  let actualJsonPath: string | undefined;
  let start = '2024-05-10';
  let end = '2026-05-06';
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === '--csv' && next) {
      csvPath = next;
      i++;
      continue;
    }
    if (a === '--actual-json' && next) {
      actualJsonPath = next;
      i++;
      continue;
    }
    if (a === '--start' && next) {
      start = next;
      i++;
      continue;
    }
    if (a === '--end' && next) {
      end = next;
      i++;
      continue;
    }
    usage();
  }
  if (!csvPath || !actualJsonPath) usage();
  return { csvPath, actualJsonPath, start, end };
}

function loadActualPayload(filePath: string): ActualTxn[] {
  const text = fs.readFileSync(path.resolve(filePath), 'utf8').trim();
  const payload = JSON.parse(text) as JsonPayload | ActualTxn[];

  if (Array.isArray(payload)) return payload;

  const txns = payload.transactions ?? [];
  if (payload.ok === false) {
    throw new Error('Actual JSON indicates ok:false');
  }
  return txns;
}

function main(): void {
  const opts = parseArgs(process.argv);

  const csvRows = parseCsv(opts.csvPath, opts.start, opts.end);
  const actualAll = loadActualPayload(opts.actualJsonPath);
  const actualRows = filterActualForDiff(actualAll, opts.start, opts.end);
  const { missingCsv, extraIds, counts } = computeChaseDiff(csvRows, actualRows);

  console.error(`Chase diff (${opts.start}..${opts.end})`);
  console.error(`  CSV rows in window      : ${counts.csvRows}`);
  console.error(`  Actual rows (excl SB)   : ${counts.actualRows}`);
  console.error(`  Missing in Actual       : ${counts.missingCsv}`);
  console.error(`  Extra in Actual         : ${counts.extrasActual}`);
  console.error(`  Goal: missing=0 and extra=0 before adjusting starting balance.`);

  console.log(
    JSON.stringify(
      {
        csvPath: opts.csvPath,
        actualJsonPath: opts.actualJsonPath,
        window: { start: opts.start, end: opts.end },
        counts: {
          csvRows: counts.csvRows,
          actualRows: counts.actualRows,
          missingCsv: counts.missingCsv,
          extrasActual: counts.extrasActual,
        },
        missingCsvRows: missingCsv,
        extraActualTransactionIds: extraIds,
      },
      null,
      2,
    ),
  );
}

main();
