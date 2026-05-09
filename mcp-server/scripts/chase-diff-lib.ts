/**
 * Chase checking CSV multiset diff vs Actual JSON rows — shared library.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface CsvRow {
  isoDate: string;
  amountCents: number;
  description: string;
  key: string;
}

export interface ActualTxn {
  id: string;
  date: string;
  amount: number;
  payee_name: string | null;
  imported_payee: string | null;
  notes: string | null;
  starting_balance_flag: boolean;
}

export interface ChaseDiffCounts {
  csvRows: number;
  actualRows: number;
  missingCsv: number;
  extrasActual: number;
}

export function normalizeDesc(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().toUpperCase();
}

export function chasePostingToIso(us: string): string {
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

export function dollarsToCents(n: number): number {
  return Math.round(Math.round((n + Number.EPSILON) * 100));
}

/** Split CSV line respecting double-quoted fields (Chase escapes "" inside quotes). */
export function splitCsvLine(line: string): string[] {
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

export function makeKey(isoDate: string, cents: number, desc: string): string {
  return `${isoDate}|${cents}|${normalizeDesc(desc)}`;
}

export function inRange(isoDate: string, start: string, end: string): boolean {
  return isoDate >= start && isoDate <= end;
}

export function parseCsv(filePath: string, start: string, end: string): CsvRow[] {
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

/** Posted balance shown on Chase CSV’s newest posting row (row 2 in standard export after header). */
export function chaseCsvEndingBalanceCents(csvPath: string): number {
  const text = fs.readFileSync(path.resolve(csvPath), 'utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) {
    throw new Error('Chase CSV has no transactions');
  }
  const header = splitCsvLine(lines[0]!);
  const balIdx = header.indexOf('Balance');
  if (balIdx < 0) {
    throw new Error(`Unexpected CSV header: missing Balance (${header.join(',')})`);
  }
  const firstRow = splitCsvLine(lines[1]!);
  const rawBal = firstRow[balIdx]!.trim();
  if (!rawBal.length) throw new Error('Chase CSV: empty Balance cell on newest row');
  const dollars = Number.parseFloat(rawBal);
  if (!Number.isFinite(dollars)) throw new Error(`Bad Balance "${rawBal}"`);
  return dollarsToCents(dollars);
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

function multisetRemove<T>(buckets: Map<string, T[]>, key: string): boolean {
  const list = buckets.get(key);
  if (!list?.length) {
    return false;
  }
  list.pop();
  if (list.length === 0) {
    buckets.delete(key);
  } else {
    buckets.set(key, list);
  }
  return true;
}

function multisetAdd<T>(buckets: Map<string, T[]>, key: string, item: T): void {
  const list = buckets.get(key);
  if (list) list.push(item);
  else buckets.set(key, [item]);
}

/** Actual rows excluding starting balance; date window inclusive. */
export function filterActualForDiff(txns: ActualTxn[], start: string, end: string): ActualTxn[] {
  return txns.filter((t) => !t.starting_balance_flag && inRange(t.date, start, end));
}

export function computeChaseDiff(
  csvRows: CsvRow[],
  actualRows: ActualTxn[],
): { missingCsv: CsvRow[]; extraIds: string[]; counts: ChaseDiffCounts } {
  const csvBuckets = new Map<string, CsvRow[]>();
  for (const r of csvRows) {
    multisetAdd(csvBuckets, r.key, r);
  }

  const extraIds: string[] = [];
  for (const t of actualRows) {
    let matched = false;
    for (const cand of actualDescriptionCandidates(t)) {
      const key = makeKey(t.date, t.amount, cand);
      if (multisetRemove(csvBuckets, key)) {
        matched = true;
        break;
      }
    }
    if (!matched) extraIds.push(t.id);
  }

  const missingCsv: CsvRow[] = [];
  for (const list of csvBuckets.values()) {
    missingCsv.push(...list);
  }
  missingCsv.sort((a, b) => a.isoDate.localeCompare(b.isoDate) || a.key.localeCompare(b.key));
  extraIds.sort();

  const counts: ChaseDiffCounts = {
    csvRows: csvRows.length,
    actualRows: actualRows.length,
    missingCsv: missingCsv.length,
    extrasActual: extraIds.length,
  };
  return { missingCsv, extraIds, counts };
}
