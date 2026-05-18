/**
 * Multiset diff Chase checking CSV vs get-transactions JSON (outputFormat=json).
 *
 * 1. Deploy MCP with get-transactions outputFormat=json support.
 * 2. Call get-transactions for 🏦 Chase Checking with date range & outputFormat json; save MCP text payload to a file.
 * 3. Run:
 *    pnpm exec tsx scripts/chase-checking-diff.ts \
 *      --csv ../imports/chase-checking_through_2026-05-07.csv \
 *      --actual-json ./chase-from-mcp.json
 *
 * Optional: --start 2024-05-10 --end 2026-05-06
 */

import fs from 'node:fs';
import path from 'node:path';

interface CliOpts {
  csvPath: string;
  actualJsonPath: string;
  start: string;
  end: string;
}

interface CsvRow {
  isoDate: string;
  amountCents: number;
  description: string;
  key: string;
}

interface ActualTxn {
  id: string;
  date: string;
  amount: number;
  payee_name: string | null;
  imported_payee: string | null;
  notes: string | null;
  starting_balance_flag: boolean;
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

function normalizeDesc(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().toUpperCase();
}

function chasePostingToIso(us: string): string {
  const [mmRaw, ddRaw, yyyyRaw] = us
    .trim()
    .split('/')
    .map((s) => s.trim());
  if (!mmRaw || !ddRaw || !yyyyRaw) {
    throw new Error(`Bad posting date: ${us}`);
  }
  const mm = mmRaw.padStart(2, '0');
  const dd = ddRaw.padStart(2, '0');
  return `${yyyyRaw}-${mm}-${dd}`;
}

function dollarsToCents(n: number): number {
  return Math.round(Math.round((n + Number.EPSILON) * 100));
}

/** Split CSV line respecting double-quoted fields (Chase escapes "" inside quotes). */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (c === ',' && !quoted) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function makeKey(isoDate: string, cents: number, desc: string): string {
  return `${isoDate}|${cents}|${normalizeDesc(desc)}`;
}

function inRange(isoDate: string, start: string, end: string): boolean {
  return isoDate >= start && isoDate <= end;
}

function parseCsv(filePath: string, start: string, end: string): CsvRow[] {
  const text = fs.readFileSync(path.resolve(filePath), 'utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const header = splitCsvLine(lines[0]!);
  const postIdx = header.indexOf('Posting Date');
  const descIdx = header.indexOf('Description');
  const amtIdx = header.indexOf('Amount');
  if (postIdx < 0 || descIdx < 0 || amtIdx < 0) {
    throw new Error(`Unexpected CSV header: ${header.join(',')}`);
  }

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]!);
    const iso = chasePostingToIso(cols[postIdx]!.trim());
    if (!inRange(iso, start, end)) continue;

    const amount = Number.parseFloat(cols[amtIdx]!.trim());
    if (!Number.isFinite(amount)) continue;

    let description = cols[descIdx]!.trim();
    if (description.startsWith('"') && description.endsWith('"')) {
      description = description.slice(1, -1).replace(/""/g, '"');
    }
    const cents = dollarsToCents(amount);
    const key = makeKey(iso, cents, description);
    rows.push({ isoDate: iso, amountCents: cents, description, key });
  }
  return rows;
}

function mergeActualMemo(t: ActualTxn): string {
  const chunks = [
    (t.imported_payee ?? '').trim(),
    (t.payee_name ?? '').trim(),
    (t.notes ?? '').trim(),
  ].filter(Boolean);
  return chunks.join(' · ');
}

function actualDescriptionCandidates(t: ActualTxn): string[] {
  const merged = mergeActualMemo(t);
  const d2 = (t.imported_payee ?? '').trim();
  const d3 = (t.payee_name ?? '').trim();
  const d4 = (t.notes ?? '').trim();
  return [...new Set([merged, d2, d3, d4].filter((s) => s.length > 0))];
}

function loadActualPayload(filePath: string): ActualTxn[] {
  const text = fs.readFileSync(path.resolve(filePath), 'utf8').trim();
  const payload = JSON.parse(text) as JsonPayload | ActualTxn[];

  if (Array.isArray(payload)) {
    return payload;
  }

  const txns = payload.transactions ?? [];
  if (payload.ok === false) {
    throw new Error('Actual JSON indicates ok:false');
  }
  return txns;
}

function buildActualCsvLikeKeys(txns: ActualTxn[], start: string, end: string): ActualTxn[] {
  return txns.filter((t) => !t.starting_balance_flag && inRange(t.date, start, end));
}

function multisetRemove<T>(buckets: Map<string, T[]>, key: string): { item: T; removed: boolean } {
  const list = buckets.get(key);
  if (!list?.length) {
    return { item: undefined as unknown as T, removed: false };
  }
  const item = list.pop()!;
  if (list.length === 0) {
    buckets.delete(key);
  } else {
    buckets.set(key, list);
  }
  return { item, removed: true };
}

function multisetAdd<T>(buckets: Map<string, T[]>, key: string, item: T): void {
  const list = buckets.get(key);
  if (list) {
    list.push(item);
  } else {
    buckets.set(key, [item]);
  }
}

function main(): void {
  const opts = parseArgs(process.argv);

  const csvRows = parseCsv(opts.csvPath, opts.start, opts.end);
  const actualAll = loadActualPayload(opts.actualJsonPath);
  const actualRows = buildActualCsvLikeKeys(actualAll, opts.start, opts.end);

  const csvBuckets = new Map<string, CsvRow[]>();
  for (const r of csvRows) {
    multisetAdd(csvBuckets, r.key, r);
  }

  const extraIds: string[] = [];

  for (const t of actualRows) {
    let matched = false;
    for (const cand of actualDescriptionCandidates(t)) {
      const key = makeKey(t.date, t.amount, cand);
      const { removed } = multisetRemove(csvBuckets, key);
      if (removed) {
        matched = true;
        break;
      }
    }
    if (!matched) extraIds.push(t.id);
  }

  /** Remaining CSV bucket entries are missing from Actual */
  const missingCsv: CsvRow[] = [];
  for (const list of csvBuckets.values()) {
    missingCsv.push(...list);
  }

  missingCsv.sort((a, b) => a.isoDate.localeCompare(b.isoDate) || a.key.localeCompare(b.key));
  extraIds.sort();

  console.error(`Chase diff (${opts.start}..${opts.end})`);
  console.error(`  CSV rows in window     : ${csvRows.length}`);
  console.error(`  Actual rows (excl SB) : ${actualRows.length}`);
  console.error(`  Missing in Actual       : ${missingCsv.length}`);
  console.error(`  Extra in Actual       : ${extraIds.length}`);
  console.error(`  Goal: missing=0 and extra=0 before adjusting starting balance.`);

  const report = {
    csvPath: opts.csvPath,
    actualJsonPath: opts.actualJsonPath,
    window: { start: opts.start, end: opts.end },
    counts: {
      csvRows: csvRows.length,
      actualRows: actualRows.length,
      missingCsv: missingCsv.length,
      extrasActual: extraIds.length,
    },
    missingCsvRows: missingCsv,
    extraActualTransactionIds: extraIds,
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
