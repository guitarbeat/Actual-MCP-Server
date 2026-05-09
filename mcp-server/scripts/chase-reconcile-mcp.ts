/**
 * Full Chase Checking reconciliation vs Chase CSV via streamable MCP (Render).
 *
 * Reads Bearer from MCP_ACTUAL_AUTHORIZATION env (full header value, e.g. "Bearer xxx")
 * or ~/.cursor/mcp.json (actual-mcp-remote).
 *
 * Preview (no mutations):
 *   pnpm exec tsx scripts/chase-reconcile-mcp.ts --csv ../imports/chase-checking_through_2026-05-07.csv
 *
 * Execute:
 *   pnpm exec tsx scripts/chase-reconcile-mcp.ts --csv ../imports/chase-checking_through_2026-05-07.csv --execute
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { ActualTxn, CsvRow } from './chase-diff-lib.js';
import {
  chaseCsvEndingBalanceCents,
  computeChaseDiff,
  filterActualForDiff,
  parseCsv,
} from './chase-diff-lib.js';

const DEFAULT_ACCOUNT = '🏦 Chase Checking';
const DEFAULT_MCP_JSON = path.join(process.env.HOME ?? '', '.cursor', 'mcp.json');
const DEFAULT_WINDOW = { start: '2024-05-10', end: '2026-05-06' } as const;
const MCP_URL_FALLBACK = 'https://actual-mcp.onrender.com/mcp';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveExistingConfigPath(p: string): string {
  return path.resolve(p);
}

type CursorMcpServerHeaders = Record<string, string>;
type CursorMcpServerEntry = { headers?: CursorMcpServerHeaders };

function loadBearerFromCursorConfig(configPath: string): string {
  const raw = fs.readFileSync(configPath, 'utf8');
  const j = JSON.parse(raw) as { mcpServers?: Record<string, CursorMcpServerEntry> };
  const auth = j.mcpServers?.['actual-mcp-remote']?.headers?.Authorization;
  if (!auth?.startsWith('Bearer ')) {
    throw new Error(`Missing actual-mcp-remote Authorization in ${configPath}`);
  }
  return auth.trim();
}

function parseUsdToCents(s: string): number {
  const n = Number(s.replace(/\$/g, '').replace(/,/g, '').trim());
  if (!Number.isFinite(n)) throw new Error(`Bad USD: ${JSON.stringify(s)}`);
  return Math.round(n * 100);
}

/** Match set-account-starting-balance server parser: cents if |amount|≥1000 else dollars→cents via *100 — use raw cents passthrough when magnitude large. */
function mcpSbAmountArgument(amountCents: number): number {
  return Math.abs(amountCents) >= 1000 ? amountCents : amountCents / 100;
}

function sseDataRecords(text: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const chunk = line.slice(6).trim();
    if (chunk === '[DONE]' || chunk.length === 0) continue;
    try {
      const parsed = JSON.parse(chunk) as Record<string, unknown>;
      out.push(parsed);
    } catch {
      // transient / non-json noise
    }
  }
  return out;
}

function findRpcById(
  messages: Record<string, unknown>[],
  rpcId: number,
): Record<string, unknown> | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!;
    if (m?.id === rpcId && 'jsonrpc' in m) return m;
  }
  return null;
}

function assertMcpRpcSuccess(
  messages: Record<string, unknown>[],
  rpcId: number,
  phase: string,
): void {
  const msg = findRpcById(messages, rpcId);
  if (!msg) {
    throw new Error(`${phase}: missing JSON-RPC envelope for id ${rpcId}`);
  }
  if (msg.error != null) {
    const e = msg.error as { message?: string };
    const summary = typeof e.message === 'string' ? e.message : JSON.stringify(msg.error);
    throw new Error(`${phase}: ${summary}`);
  }
}

async function fetchPost(
  url: string,
  auth: string,
  body: Record<string, unknown>,
  headers: Record<string, string>,
): Promise<{ status: number; text: string; sessionHeader: string | null }> {
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...headers,
    },
    body: JSON.stringify(body),
  });

  const text = await r.text();
  const sessionHeader =
    r.headers.get('mcp-session-id') ||
    r.headers.get('Mcp-Session-Id') ||
    r.headers.get('MCP-Session-Id');
  return { status: r.status, text, sessionHeader: sessionHeader ?? null };
}

function parseToolJsonContent(messages: Record<string, unknown>, rpcId: number): unknown {
  const msg = findRpcById(messages, rpcId);
  if (!msg) {
    throw new Error(`Missing JSON-RPC reply for id ${rpcId}`);
  }
  if (msg.error != null) {
    const e = msg.error as { message?: string };
    const summary = typeof e.message === 'string' ? e.message : JSON.stringify(msg.error);
    throw new Error(`MCP RPC error id=${rpcId}: ${summary}`);
  }

  const result = msg.result as { content?: { type?: string; text?: string }[] };
  const text = result?.content?.find((x) => x?.type === 'text')?.text;
  if (typeof text !== 'string') {
    throw new Error(`MCP RPC id=${rpcId}: unexpected result shape`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

class McpActualClient {
  private readonly url: string;

  private readonly auth: string;

  private sid: string | null = null;

  private rpc = 1000;

  constructor(url: string, authBearerLine: string) {
    this.url = url.replace(/\/$/, '');
    this.auth = authBearerLine.startsWith('Bearer ') ? authBearerLine : `Bearer ${authBearerLine}`;
  }

  async connect(): Promise<void> {
    const id = ++this.rpc;
    const { status, text, sessionHeader } = await fetchPost(
      this.url,
      this.auth,
      {
        jsonrpc: '2.0',
        id,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'chase-reconcile-mcp', version: '1.0.0' },
        },
      },
      {},
    );
    const records = sseDataRecords(text);
    if (status !== 200) throw new Error(`initialize HTTP ${status}: ${text.slice(0, 400)}`);

    assertMcpRpcSuccess(records, id, 'initialize');
    this.sid = sessionHeader ?? null;
    if (!this.sid) throw new Error('initialize: missing MCP session header');

    const r2 = await fetchPost(
      this.url,
      this.auth,
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { 'mcp-session-id': this.sid },
    );
    if (r2.status !== 200 && r2.status !== 202) {
      console.error(`notifications/initialized HTTP ${r2.status} (${r2.text.slice(0, 160)})`);
    }
  }

  async callTool<T = unknown>(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<{ raw: Record<string, unknown>[]; parsed: T }> {
    if (!this.sid) throw new Error('MCP not connected');

    const id = ++this.rpc;
    const { status, text } = await fetchPost(
      this.url,
      this.auth,
      {
        jsonrpc: '2.0',
        id,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
      },
      { 'mcp-session-id': this.sid },
    );
    const records = sseDataRecords(text);
    if (status !== 200) throw new Error(`${toolName} HTTP ${status}: ${text.slice(0, 400)}`);

    const parsedUnknown = parseToolJsonContent(records, id);

    return { raw: records, parsed: parsedUnknown as T };
  }
}

function importedStableId(row: CsvRow): string {
  const h = crypto.createHash('sha256').update(row.key).digest('hex').slice(0, 20);
  return `chase-strict:${row.isoDate}:${row.amountCents}:${h}`;
}

function chunk<T>(xs: readonly T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

interface GetTxnJsonPayload {
  ok?: boolean;
  transactions: ActualTxn[];
  pagination?: { offset: number; limit: number; hasMore?: boolean; nextOffset?: number };
  totals?: { matchingAfterFilters: number };
}

async function fetchAllChaseJson(
  mcp: McpActualClient,
  accountId: string,
  startDate: string,
  endDate: string,
): Promise<ActualTxn[]> {
  let offset = 0;
  const all: ActualTxn[] = [];

  while (true) {
    const { parsed } = await mcp.callTool<GetTxnJsonPayload>('get-transactions', {
      accountId,
      startDate,
      endDate,
      outputFormat: 'json',
      limit: 5000,
      offset,
    });

    const page = parsed.transactions ?? [];
    all.push(...page);

    const hasMore = parsed.pagination?.hasMore === true;
    const next = parsed.pagination?.nextOffset;
    if (!hasMore || next === undefined || next === offset) break;
    offset = next;
  }

  return all;
}

function parseCli(argv: string[]) {
  let csvPath: string | undefined;
  let execute = false;
  let skipSb = false;
  let authPath = process.env.MCP_ACTUAL_AUTH_JSON ?? DEFAULT_MCP_JSON;
  let authHeader = process.env.MCP_ACTUAL_AUTHORIZATION ?? '';
  let mcpUrl = process.env.MCP_ACTUAL_URL ?? MCP_URL_FALLBACK;
  let { start } = DEFAULT_WINDOW;
  let { end } = DEFAULT_WINDOW;

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const n = argv[i + 1];
    if (a === '--csv' && n) {
      csvPath = n;
      i++;
      continue;
    }
    if (a === '--execute') {
      execute = true;
      continue;
    }
    if (a === '--skip-starting-balance') {
      skipSb = true;
      continue;
    }
    if (a === '--mcp-json' && n) {
      authPath = n;
      i++;
      continue;
    }
    if (a === '--mcp-url' && n) {
      mcpUrl = n;
      i++;
      continue;
    }
    if (a === '--start' && n) {
      start = n;
      i++;
      continue;
    }
    if (a === '--end' && n) {
      end = n;
      i++;
      continue;
    }
    throw new Error(`Unknown arg ${a}`);
  }

  if (!csvPath) throw new Error('Missing --csv path');
  if (!authHeader) authHeader = loadBearerFromCursorConfig(resolveExistingConfigPath(authPath));

  return { csvPath, execute, skipSb, authHeader, mcpUrl, start, end };
}

async function main(): Promise<void> {
  const opts = parseCli(process.argv);
  const csvRows = parseCsv(opts.csvPath, opts.start, opts.end);
  const targetEndingCents = chaseCsvEndingBalanceCents(opts.csvPath);

  const mcp = new McpActualClient(opts.mcpUrl, opts.authHeader);
  console.error(`Connecting MCP ${opts.mcpUrl}`);
  await mcp.connect();

  const maxPasses = opts.execute ? 20 : 1;
  for (let pass = 1; pass <= maxPasses; pass++) {
    const actualAll = await fetchAllChaseJson(mcp, DEFAULT_ACCOUNT, opts.start, opts.end);
    const actualRows = filterActualForDiff(actualAll, opts.start, opts.end);
    const { missingCsv, extraIds, counts } = computeChaseDiff(csvRows, actualRows);

    console.error(
      `[pass ${pass}] CSV=${counts.csvRows} Actual=${counts.actualRows} missing=${counts.missingCsv} extras=${counts.extrasActual}`,
    );

    if (counts.missingCsv === 0 && counts.extrasActual === 0) {
      console.error('Row multiset parity achieved.');

      if (!opts.skipSb) {
        const { parsed: accountsDoc } = await mcp.callTool<{
          accounts?: { id: string; name: string; balance: string }[];
        }>('get-accounts', { accountId: 'Chase Checking' });
        const acc = accountsDoc.accounts?.find(
          (a) =>
            String(a?.name ?? '').includes('Chase') && String(a?.name ?? '').includes('Checking'),
        );
        if (!acc?.balance) throw new Error('get-accounts could not locate Chase Checking');
        const ledgerCents = parseUsdToCents(acc.balance);
        const delta = targetEndingCents - ledgerCents;
        console.error(
          `[balance] Ledger ${acc.balance} | CSV newest-row balance $${(targetEndingCents / 100).toFixed(2)} | delta¢ ${delta}`,
        );

        if (delta !== 0 && opts.execute) {
          const sbRow = actualAll.find((t) => t.starting_balance_flag);
          if (!sbRow) {
            throw new Error(
              'Ledger mismatch after parity but no starting_balance transaction visible in fetch payload',
            );
          }
          const newSbCents = sbRow.amount + delta;
          console.error(
            `Updating starting balance to ${newSbCents}c (was ${sbRow.amount}c) date=${sbRow.date}`,
          );
          await mcp.callTool('set-account-starting-balance', {
            account: DEFAULT_ACCOUNT,
            amount: mcpSbAmountArgument(newSbCents),
            date: sbRow.date,
            notes: `Chase CSV ending balance (${opts.end}); ledger delta ${delta}¢.`,
          });

          const { parsed: verify } = await mcp.callTool<{ accounts?: { balance: string }[] }>(
            'get-accounts',
            { accountId: 'Chase Checking' },
          );
          const row = verify.accounts?.find(
            (a) =>
              String(a?.name ?? '').includes('Chase') && String(a?.name ?? '').includes('Checking'),
          );
          if (row?.balance && parseUsdToCents(row.balance) !== targetEndingCents) {
            console.error(
              `⚠ Ledger after SB update: ${row.balance} (wanted $${(targetEndingCents / 100).toFixed(2)})`,
            );
          } else {
            console.error(`✓ Ledger now matches Chase CSV newest posting balance`);
          }
        } else if (delta !== 0 && !opts.execute) {
          console.error(
            '[dry-run] Would adjust starting balance by delta¢ after parity (use --execute).',
          );
        }
      }

      return;
    }

    if (!opts.execute) {
      console.error(
        JSON.stringify(
          { missingCsv: missingCsv.slice(0, 8), extrasSample: extraIds.slice(0, 8) },
          null,
          2,
        ),
      );
      console.error('Dry run only. Pass --execute to delete extras & import misses.');
      process.exitCode = 2;
      return;
    }

    const DELETE_BATCH = 25;
    for (const ids of chunk(extraIds, DELETE_BATCH)) {
      for (const id of ids) {
        await mcp.callTool('delete-transaction', { id });
        await sleep(50);
      }
      await sleep(150);
    }

    const IMPORT_BATCH = 35;
    for (const slice of chunk(missingCsv, IMPORT_BATCH)) {
      await mcp.callTool('import-transaction-batch', {
        dryRun: false,
        defaultCleared: true,
        transactions: slice.map((row) => ({
          accountId: DEFAULT_ACCOUNT,
          date: row.isoDate,
          amount: row.amountCents,
          imported_payee: row.description.slice(0, 498),
          notes: `Chase reconcile import | ${opts.csvPath}`,
          imported_id: importedStableId(row),
        })),
      });
      await sleep(200);
    }
  }

  throw new Error('Did not converge to zero diff within maxPasses (inspect errors above)');
}

main().catch((e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  console.error(`chase-reconcile-mcp FAILED: ${m}`);
  process.exitCode = 1;
});
