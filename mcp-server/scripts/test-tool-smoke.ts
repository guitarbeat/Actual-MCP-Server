import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import {
  liveReadonlyToolCases,
  sandboxFullToolCases,
  type SmokeExpectedOutcome,
  type ToolSmokeCase,
} from './tool-smoke-manifest.js';

dotenv.config({ path: '.env', quiet: true });

type HarnessPhase = 'live' | 'sandbox' | 'all';

interface HarnessSession {
  client: Client;
  stderrLines: string[];
  close: () => Promise<void>;
}

interface LiveContext {
  currentMonth: string;
  previousMonth: string;
  previousMonthStart: string;
  currentDate: string;
  onBudgetAccount: {
    id: string;
    name: string;
    type: string;
    balance: string;
    closed: boolean;
    offBudget: boolean;
  };
}

interface SandboxState {
  originalBudgetId: string;
  sandboxBudgetId: string;
  switchedToSandbox: boolean;
  currentMonth: string;
  fixtureDate: string;
  prefix: string;
  names: {
    groupBase: string;
    groupUpdated: string;
    categoryBase: string;
    categoryUpdated: string;
    primaryAccountBase: string;
    primaryAccountUpdated: string;
    secondaryAccount: string;
    closeableAccount: string;
    deleteableAccount: string;
    merchantPayeeBase: string;
    merchantPayeeUpdated: string;
    mergeTargetPayee: string;
    mergeSourcePayee: string;
    scheduleName: string;
    transactionNotes: string;
    updatedTransactionNotes: string;
  };
  groupId?: string;
  categoryId?: string;
  primaryAccountId?: string;
  primaryAccountName?: string;
  secondaryAccountId?: string;
  closeableAccountId?: string;
  deleteableAccountId?: string;
  merchantPayeeId?: string;
  merchantPayeeName?: string;
  mergeTargetPayeeId?: string;
  mergeSourcePayeeId?: string;
  ruleId?: string;
  scheduleId?: string;
  transactionId?: string;
}

interface SmokeResult {
  tool: string;
  phase: string;
  status: 'passed' | 'failed' | 'skipped';
  detail: string;
}

const PACKAGE_ROOT = resolve(process.cwd());
const SERVER_ENTRY = resolve(PACKAGE_ROOT, 'build/index.js');
const STRICT_LIVE_MODE = 'strict-live';
const DEFAULT_PREFIX = '__mcp_tool_test__';

const {
  values: { phase: phaseArg },
} = parseArgs({
  options: {
    phase: { type: 'string', default: 'all' },
  },
});

const phase = normalizePhase(phaseArg);

function normalizePhase(value: string): HarnessPhase {
  if (value === 'live' || value === 'sandbox' || value === 'all') {
    return value;
  }

  throw new Error(`Unsupported phase "${value}". Expected one of: live, sandbox, all.`);
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatLocalMonth(date: Date): string {
  return formatLocalDate(date).slice(0, 7);
}

function shiftMonth(month: string, delta: number): string {
  const [yearString, monthString] = month.split('-');
  const date = new Date(Number.parseInt(yearString, 10), Number.parseInt(monthString, 10) - 1, 1);
  date.setMonth(date.getMonth() + delta);
  return formatLocalMonth(date);
}

function startOfMonth(month: string): string {
  return `${month}-01`;
}

function sanitizeText(value: string): string {
  let sanitized = value;
  const secrets = [process.env.ACTUAL_PASSWORD, process.env.BEARER_TOKEN].filter(
    (item): item is string => Boolean(item),
  );

  for (const secret of secrets) {
    sanitized = sanitized.split(secret).join('****');
  }

  return sanitized;
}

function tail(lines: string[], count = 12): string {
  return lines.slice(-count).join('\n');
}

function truncate(value: string, maxLength = 180): string {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 3)}...` : trimmed;
}

function buildServerEnv(): Record<string, string> {
  const env = Object.entries(process.env).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === 'string') {
      acc[key] = value;
    }

    return acc;
  }, {});

  env.ACTUAL_READ_FRESHNESS_MODE = STRICT_LIVE_MODE;
  return env;
}

async function createHarnessSession(flags: string[]): Promise<HarnessSession> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER_ENTRY, ...flags],
    cwd: PACKAGE_ROOT,
    env: buildServerEnv(),
    stderr: 'pipe',
  });

  const stderrLines: string[] = [];
  const { stderr } = transport;
  if (stderr) {
    stderr.on('data', (chunk) => {
      const text = sanitizeText(String(chunk));
      stderrLines.push(...text.split(/\r?\n/).filter(Boolean));
      if (stderrLines.length > 200) {
        stderrLines.splice(0, stderrLines.length - 200);
      }
    });
  }

  const client = new Client({
    name: 'actual-mcp-tool-smoke',
    version: '1.0.0',
  });

  await client.connect(transport);

  return {
    client,
    stderrLines,
    close: async () => {
      await client.close();
    },
  };
}

async function callTool(
  session: HarnessSession,
  name: string,
  args: Record<string, unknown> = {},
): Promise<CallToolResult> {
  const result = (await session.client.callTool({
    name,
    arguments: args,
  })) as CallToolResult;

  if (!Array.isArray(result.content)) {
    throw new Error(`Tool ${name} returned a malformed MCP payload.`);
  }

  return result;
}

function getTextContent(result: CallToolResult): string {
  const textEntry = result.content.find(
    (entry): entry is { type: 'text'; text: string } => entry.type === 'text',
  );

  if (!textEntry) {
    throw new Error('Tool response did not contain a text content entry.');
  }

  return textEntry.text;
}

function parseJsonContent<T>(result: CallToolResult): T {
  return JSON.parse(getTextContent(result)) as T;
}

function parseGuardedError(result: CallToolResult): {
  error: true;
  message: string;
  suggestion: string;
} {
  const parsed = parseJsonContent<{ error?: boolean; message?: string; suggestion?: string }>(
    result,
  );

  if (
    !parsed.error ||
    typeof parsed.message !== 'string' ||
    typeof parsed.suggestion !== 'string'
  ) {
    throw new Error('Expected a structured MCP error payload with message and suggestion.');
  }

  return parsed as { error: true; message: string; suggestion: string };
}

function extractCreatedId(result: CallToolResult, toolName: string): string {
  const text = getTextContent(result);
  const match = text.match(/with id ([0-9a-f-]{36})/i);

  if (!match) {
    throw new Error(`Could not extract created ID from ${toolName} response: ${text}`);
  }

  return match[1];
}

function ensureOutcome(
  result: CallToolResult,
  expectedOutcome: SmokeExpectedOutcome,
): { ok: boolean; detail: string } {
  if (expectedOutcome === 'success') {
    if (result.isError) {
      const payload = parseGuardedError(result);
      return { ok: false, detail: `${payload.message} | Suggestion: ${payload.suggestion}` };
    }

    return { ok: true, detail: truncate(getTextContent(result)) };
  }

  if (!result.isError) {
    return { ok: true, detail: truncate(getTextContent(result)) };
  }

  const payload = parseGuardedError(result);
  return { ok: true, detail: `${payload.message} | Suggestion: ${payload.suggestion}` };
}

async function runRecordedCase(
  session: HarnessSession,
  testCase: ToolSmokeCase,
  args: Record<string, unknown>,
  results: SmokeResult[],
): Promise<SmokeResult> {
  try {
    const result = await callTool(session, testCase.name, args);
    const outcome = ensureOutcome(result, testCase.expectedOutcome);

    if (!outcome.ok) {
      const failure = {
        tool: testCase.name,
        phase: testCase.phase,
        status: 'failed' as const,
        detail: `${outcome.detail}\n${tail(session.stderrLines)}`,
      };
      results.push(failure);
      console.error(`[fail] ${testCase.phase} :: ${testCase.name} :: ${outcome.detail}`);
      return failure;
    }

    const success = {
      tool: testCase.name,
      phase: testCase.phase,
      status: 'passed' as const,
      detail: outcome.detail,
    };
    results.push(success);
    console.log(`[pass] ${testCase.phase} :: ${testCase.name} :: ${outcome.detail}`);
    return success;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failure = {
      tool: testCase.name,
      phase: testCase.phase,
      status: 'failed' as const,
      detail: `${sanitizeText(message)}\n${tail(session.stderrLines)}`,
    };
    results.push(failure);
    console.error(`[fail] ${testCase.phase} :: ${testCase.name} :: ${sanitizeText(message)}`);
    return failure;
  }
}

async function assertSurfaceCounts(): Promise<void> {
  const expectations: Array<{ label: string; flags: string[]; expectedCount: number }> = [
    { label: 'default', flags: [], expectedCount: 13 },
    { label: 'enable-write', flags: ['--enable-write'], expectedCount: 39 },
    {
      label: 'enable-write+enable-nini',
      flags: ['--enable-write', '--enable-nini'],
      expectedCount: 47,
    },
  ];

  for (const expectation of expectations) {
    const session = await createHarnessSession(expectation.flags);
    try {
      const listed = await session.client.listTools();
      if (listed.tools.length !== expectation.expectedCount) {
        throw new Error(
          `Surface assertion failed for ${expectation.label}: expected ${expectation.expectedCount} tools, received ${listed.tools.length}.`,
        );
      }

      console.log(
        `[surface] ${expectation.label}: ${listed.tools.length} tools exposed as expected.`,
      );
    } finally {
      await session.close();
    }
  }
}

async function buildLiveContext(session: HarnessSession): Promise<LiveContext> {
  const accountResult = await callTool(session, 'get-accounts');
  const accountPayload = parseJsonContent<{
    accounts: Array<{
      id: string;
      name: string;
      type: string;
      balance: string;
      closed: boolean;
      offBudget: boolean;
    }>;
  }>(accountResult);

  const onBudgetAccount =
    accountPayload.accounts.find((account) => !account.closed && !account.offBudget) ??
    accountPayload.accounts.find((account) => !account.closed);

  if (!onBudgetAccount) {
    throw new Error('Live smoke testing requires at least one non-closed account.');
  }

  const budgetMonthsResult = await callTool(session, 'get-budget-month');
  const budgetMonths = parseJsonContent<string[]>(budgetMonthsResult).sort();
  const fallbackMonth = formatLocalMonth(new Date());
  const currentMonth = budgetMonths.at(-1) ?? fallbackMonth;
  const previousMonth = budgetMonths.at(-2) ?? shiftMonth(currentMonth, -1);

  return {
    currentMonth,
    previousMonth,
    previousMonthStart: startOfMonth(previousMonth),
    currentDate: formatLocalDate(new Date()),
    onBudgetAccount,
  };
}

function buildLiveArgs(toolName: string, context: LiveContext): Record<string, unknown> {
  switch (toolName) {
    case 'balance-history':
      return { accountId: context.onBudgetAccount.name, months: 3 };
    case 'get-account-balance':
      return { id: context.onBudgetAccount.name };
    case 'get-accounts':
      return {};
    case 'get-budget-month':
      return { month: context.currentMonth };
    case 'get-financial-insights':
      return { month: context.currentMonth };
    case 'get-grouped-categories':
      return {};
    case 'get-payees':
      return {};
    case 'get-rules':
      return {};
    case 'get-schedules':
      return {};
    case 'get-transactions':
      return {
        accountId: context.onBudgetAccount.name,
        startDate: context.previousMonthStart,
        endDate: context.currentDate,
        limit: 5,
      };
    case 'monthly-summary':
      return { months: 3 };
    case 'recommend-budget-plan':
      return { month: context.currentMonth, lookbackMonths: 2 };
    case 'spending-by-category':
      return {
        accountId: context.onBudgetAccount.name,
        startDate: context.previousMonthStart,
        endDate: context.currentDate,
      };
    case 'get-budget-files':
      return {};
    default:
      throw new Error(`Unhandled live smoke tool ${toolName}.`);
  }
}

async function runLivePhase(results: SmokeResult[]): Promise<void> {
  const session = await createHarnessSession(['--enable-nini']);

  try {
    const listed = await session.client.listTools();
    const availableNames = new Set(listed.tools.map((tool) => tool.name));
    for (const testCase of liveReadonlyToolCases) {
      if (!availableNames.has(testCase.name)) {
        throw new Error(`Live phase expected tool "${testCase.name}" to be exposed.`);
      }
    }

    const liveContext = await buildLiveContext(session);
    console.log(
      `[live] Using account "${liveContext.onBudgetAccount.name}" and month ${liveContext.currentMonth}.`,
    );

    for (const testCase of liveReadonlyToolCases) {
      const args = buildLiveArgs(testCase.name, liveContext);
      await runRecordedCase(session, testCase, args, results);
    }
  } finally {
    await session.close();
  }
}

function createSandboxState(): SandboxState {
  const prefix = process.env.ACTUAL_TOOL_TEST_PREFIX || DEFAULT_PREFIX;
  const currentMonth = formatLocalMonth(new Date());
  const fixtureDate = formatLocalDate(new Date());
  const originalBudgetId = process.env.ACTUAL_BUDGET_SYNC_ID;
  const sandboxBudgetId = process.env.ACTUAL_TOOL_TEST_SANDBOX_BUDGET_ID;

  if (!originalBudgetId) {
    throw new Error(
      'ACTUAL_BUDGET_SYNC_ID is required to restore the original budget after sandbox testing.',
    );
  }

  if (!sandboxBudgetId) {
    throw new Error('ACTUAL_TOOL_TEST_SANDBOX_BUDGET_ID is required for sandbox testing.');
  }

  return {
    originalBudgetId,
    sandboxBudgetId,
    switchedToSandbox: false,
    currentMonth,
    fixtureDate,
    prefix,
    names: {
      groupBase: `${prefix}-group`,
      groupUpdated: `${prefix}-group-updated`,
      categoryBase: `${prefix}-category`,
      categoryUpdated: `${prefix}-category-updated`,
      primaryAccountBase: `${prefix}-checking`,
      primaryAccountUpdated: `${prefix}-checking-updated`,
      secondaryAccount: `${prefix}-starting-balance`,
      closeableAccount: `${prefix}-closeable`,
      deleteableAccount: `${prefix}-deleteable`,
      merchantPayeeBase: `${prefix}-merchant`,
      merchantPayeeUpdated: `${prefix}-merchant-updated`,
      mergeTargetPayee: `${prefix}-merge-target`,
      mergeSourcePayee: `${prefix}-merge-source`,
      scheduleName: `${prefix}-schedule`,
      transactionNotes: `${prefix}-manual-expense`,
      updatedTransactionNotes: `${prefix}-manual-expense-updated`,
    },
  };
}

function assertDefined(
  value: string | undefined,
  fieldName: string,
  toolName: string,
): asserts value is string {
  if (!value) {
    throw new Error(`Missing ${fieldName} before running ${toolName}.`);
  }
}

async function createHelperAccount(session: HarnessSession, name: string): Promise<string> {
  const result = await callTool(session, 'create-account', {
    name,
    type: 'checking',
    offbudget: false,
  });

  if (result.isError) {
    const payload = parseGuardedError(result);
    throw new Error(`Helper account creation failed: ${payload.message}`);
  }

  return extractCreatedId(result, 'create-account helper');
}

async function createHelperPayee(session: HarnessSession, name: string): Promise<string> {
  const result = await callTool(session, 'create-payee', { name });

  if (result.isError) {
    const payload = parseGuardedError(result);
    throw new Error(`Helper payee creation failed: ${payload.message}`);
  }

  return extractCreatedId(result, 'create-payee helper');
}

function extractIdFromDetail(detail: string, toolName: string): string {
  const match = detail.match(/([0-9a-f-]{36})/i);
  if (!match) {
    throw new Error(`Could not extract ID from ${toolName} result detail: ${detail}`);
  }

  return match[1];
}

async function assertSandboxBudgetPresent(
  session: HarnessSession,
  state: SandboxState,
): Promise<void> {
  const budgetsResult = await callTool(session, 'get-budget-files');
  const budgets = parseJsonContent<
    Array<{
      id?: string;
      groupId?: string;
      cloudFileId?: string;
    }>
  >(budgetsResult);

  const found = budgets.some(
    (budget) =>
      budget.id === state.sandboxBudgetId ||
      budget.groupId === state.sandboxBudgetId ||
      budget.cloudFileId === state.sandboxBudgetId,
  );

  if (!found) {
    throw new Error(
      `Sandbox budget "${state.sandboxBudgetId}" was not found in get-budget-files output.`,
    );
  }
}

async function buildSandboxArgs(
  toolName: string,
  state: SandboxState,
): Promise<Record<string, unknown>> {
  switch (toolName) {
    case 'switch-budget':
      return { budgetId: state.sandboxBudgetId };
    case 'create-category-group':
      return { name: state.names.groupBase };
    case 'update-category-group':
      assertDefined(state.groupId, 'groupId', toolName);
      return { id: state.groupId, name: state.names.groupUpdated };
    case 'create-category':
      assertDefined(state.groupId, 'groupId', toolName);
      return { name: state.names.categoryBase, groupId: state.groupId };
    case 'update-category':
      assertDefined(state.categoryId, 'categoryId', toolName);
      assertDefined(state.groupId, 'groupId', toolName);
      return { id: state.categoryId, name: state.names.categoryUpdated, groupId: state.groupId };
    case 'create-account':
      return {
        name: state.names.primaryAccountBase,
        type: 'checking',
        offbudget: false,
        initialBalance: 10000,
      };
    case 'update-account':
      assertDefined(state.primaryAccountId, 'primaryAccountId', toolName);
      return {
        id: state.primaryAccountId,
        name: state.names.primaryAccountUpdated,
        type: 'checking',
        offbudget: false,
      };
    case 'create-payee':
      return { name: state.names.merchantPayeeBase };
    case 'update-payee':
      assertDefined(state.merchantPayeeId, 'merchantPayeeId', toolName);
      return { id: state.merchantPayeeId, name: state.names.merchantPayeeUpdated };
    case 'create-rule':
      assertDefined(state.merchantPayeeId, 'merchantPayeeId', toolName);
      assertDefined(state.categoryId, 'categoryId', toolName);
      return {
        conditionsOp: 'and',
        conditions: [{ field: 'payee', op: 'is', value: state.merchantPayeeId }],
        actions: [{ field: 'category', op: 'set', value: state.categoryId }],
      };
    case 'update-rule':
      assertDefined(state.ruleId, 'ruleId', toolName);
      return { id: state.ruleId, stage: 'post' };
    case 'merge-payees':
      assertDefined(state.mergeTargetPayeeId, 'mergeTargetPayeeId', toolName);
      assertDefined(state.mergeSourcePayeeId, 'mergeSourcePayeeId', toolName);
      return {
        targetPayeeId: state.mergeTargetPayeeId,
        sourcePayeeIds: [state.mergeSourcePayeeId],
      };
    case 'create-schedule':
      assertDefined(state.primaryAccountName, 'primaryAccountName', toolName);
      assertDefined(state.merchantPayeeName, 'merchantPayeeName', toolName);
      return {
        name: state.names.scheduleName,
        accountId: state.primaryAccountName,
        amount: -25,
        date: {
          frequency: 'monthly',
          start: state.fixtureDate,
          endMode: 'never',
        },
        payee: state.merchantPayeeName,
        category: state.names.categoryUpdated,
      };
    case 'update-schedule':
      assertDefined(state.scheduleId, 'scheduleId', toolName);
      return { id: state.scheduleId, notes: `${state.prefix} schedule updated` };
    case 'create-transaction':
      assertDefined(state.primaryAccountName, 'primaryAccountName', toolName);
      assertDefined(state.merchantPayeeName, 'merchantPayeeName', toolName);
      return {
        account: state.primaryAccountName,
        date: state.fixtureDate,
        amount: -12.34,
        payee: state.merchantPayeeName,
        category: state.names.categoryUpdated,
        notes: state.names.transactionNotes,
      };
    case 'update-transaction':
      assertDefined(state.transactionId, 'transactionId', toolName);
      return {
        id: state.transactionId,
        notes: state.names.updatedTransactionNotes,
      };
    case 'set-account-starting-balance':
      return {
        account: state.names.secondaryAccount,
        amount: 5000,
        date: state.fixtureDate,
        notes: `${state.prefix} opening balance`,
      };
    case 'set-budget':
      return { month: state.currentMonth, category: state.names.categoryUpdated, amount: 25 };
    case 'apply-budget-plan':
      assertDefined(state.categoryId, 'categoryId', toolName);
      return {
        month: state.currentMonth,
        recommendations: [
          {
            categoryId: state.categoryId,
            categoryName: state.names.categoryUpdated,
            amount: 2600,
          },
        ],
      };
    case 'reconcile-account':
      assertDefined(state.primaryAccountName, 'primaryAccountName', toolName);
      return {
        account: state.primaryAccountName,
        statementBalance: 87.66,
        statementDate: state.fixtureDate,
      };
    case 'hold-budget':
      return { month: state.currentMonth, amount: 500 };
    case 'reset-budget-hold':
      return { month: state.currentMonth };
    case 'import-transaction-batch':
      assertDefined(state.primaryAccountId, 'primaryAccountId', toolName);
      return {
        dryRun: true,
        defaultCleared: false,
        transactions: [
          {
            accountId: state.primaryAccountId,
            date: state.fixtureDate,
            amount: -4321,
            payee_name: `${state.prefix}-batch-import-payee`,
            notes: `${state.prefix}-batch-import`,
            imported_id: `${state.prefix}-batch-import-1`,
          },
        ],
      };
    case 'import-transactions':
      assertDefined(state.primaryAccountId, 'primaryAccountId', toolName);
      return { source: 'bank', accountId: state.primaryAccountId };
    case 'close-account':
      assertDefined(state.closeableAccountId, 'closeableAccountId', toolName);
      return { id: state.closeableAccountId };
    case 'reopen-account':
      assertDefined(state.closeableAccountId, 'closeableAccountId', toolName);
      return { id: state.closeableAccountId };
    case 'delete-account':
      assertDefined(state.deleteableAccountId, 'deleteableAccountId', toolName);
      return { id: state.deleteableAccountId };
    case 'delete-schedule':
      assertDefined(state.scheduleId, 'scheduleId', toolName);
      return { id: state.scheduleId };
    case 'delete-transaction':
      assertDefined(state.transactionId, 'transactionId', toolName);
      return { id: state.transactionId };
    case 'delete-rule':
      assertDefined(state.ruleId, 'ruleId', toolName);
      return { id: state.ruleId };
    case 'delete-payee':
      assertDefined(state.merchantPayeeId, 'merchantPayeeId', toolName);
      return { id: state.merchantPayeeId };
    case 'delete-category':
      assertDefined(state.categoryId, 'categoryId', toolName);
      return { id: state.categoryId };
    case 'delete-category-group':
      assertDefined(state.groupId, 'groupId', toolName);
      return { id: state.groupId };
    default:
      throw new Error(`Unhandled sandbox smoke tool ${toolName}.`);
  }
}

async function captureSandboxSideEffects(
  toolName: string,
  detail: string,
  state: SandboxState,
  session: HarnessSession,
): Promise<void> {
  switch (toolName) {
    case 'switch-budget':
      state.switchedToSandbox = true;
      break;
    case 'create-category-group':
      state.groupId = extractIdFromDetail(detail, toolName);
      break;
    case 'create-category':
      state.categoryId = extractIdFromDetail(detail, toolName);
      break;
    case 'create-account':
      state.primaryAccountId = extractIdFromDetail(detail, toolName);
      state.primaryAccountName = state.names.primaryAccountBase;
      state.secondaryAccountId = await createHelperAccount(session, state.names.secondaryAccount);
      state.closeableAccountId = await createHelperAccount(session, state.names.closeableAccount);
      state.deleteableAccountId = await createHelperAccount(session, state.names.deleteableAccount);
      break;
    case 'update-account':
      state.primaryAccountName = state.names.primaryAccountUpdated;
      break;
    case 'create-payee':
      state.merchantPayeeId = extractIdFromDetail(detail, toolName);
      state.merchantPayeeName = state.names.merchantPayeeBase;
      state.mergeTargetPayeeId = await createHelperPayee(session, state.names.mergeTargetPayee);
      state.mergeSourcePayeeId = await createHelperPayee(session, state.names.mergeSourcePayee);
      break;
    case 'update-payee':
      state.merchantPayeeName = state.names.merchantPayeeUpdated;
      break;
    case 'create-rule':
      state.ruleId = extractIdFromDetail(detail, toolName);
      break;
    case 'create-schedule':
      state.scheduleId = extractIdFromDetail(detail, toolName);
      break;
    case 'create-transaction':
      state.transactionId = extractIdFromDetail(detail, toolName);
      break;
    case 'delete-schedule':
      state.scheduleId = undefined;
      break;
    case 'delete-transaction':
      state.transactionId = undefined;
      break;
    case 'delete-rule':
      state.ruleId = undefined;
      break;
    case 'delete-payee':
      state.merchantPayeeId = undefined;
      state.merchantPayeeName = undefined;
      if (state.mergeTargetPayeeId) {
        await callTool(session, 'delete-payee', { id: state.mergeTargetPayeeId });
        state.mergeTargetPayeeId = undefined;
      }
      state.mergeSourcePayeeId = undefined;
      break;
    case 'delete-category':
      state.categoryId = undefined;
      break;
    case 'delete-category-group':
      state.groupId = undefined;
      break;
    case 'delete-account':
      state.deleteableAccountId = undefined;
      break;
    default:
      break;
  }
}

async function bestEffortTool(
  session: HarnessSession,
  name: string,
  args: Record<string, unknown>,
): Promise<void> {
  try {
    await callTool(session, name, args);
  } catch {
    // Best-effort cleanup only.
  }
}

async function bestEffortSandboxCleanup(
  session: HarnessSession,
  state: SandboxState,
): Promise<void> {
  if (!state.switchedToSandbox) {
    return;
  }

  if (state.transactionId) {
    await bestEffortTool(session, 'delete-transaction', { id: state.transactionId });
  }
  if (state.scheduleId) {
    await bestEffortTool(session, 'delete-schedule', { id: state.scheduleId });
  }
  if (state.ruleId) {
    await bestEffortTool(session, 'delete-rule', { id: state.ruleId });
  }
  if (state.merchantPayeeId) {
    await bestEffortTool(session, 'delete-payee', { id: state.merchantPayeeId });
  }
  if (state.mergeTargetPayeeId) {
    await bestEffortTool(session, 'delete-payee', { id: state.mergeTargetPayeeId });
  }
  if (state.categoryId) {
    await bestEffortTool(session, 'delete-category', { id: state.categoryId });
  }
  if (state.groupId) {
    await bestEffortTool(session, 'delete-category-group', { id: state.groupId });
  }

  await bestEffortTool(session, 'switch-budget', { budgetId: state.originalBudgetId });
}

async function runSandboxPhase(results: SmokeResult[]): Promise<void> {
  if (!process.env.ACTUAL_TOOL_TEST_SANDBOX_BUDGET_ID) {
    const detail = 'ACTUAL_TOOL_TEST_SANDBOX_BUDGET_ID is not set; sandbox phase skipped.';
    console.log(`[sandbox] ${detail}`);
    results.push({
      tool: 'sandbox-phase',
      phase: 'sandbox-full',
      status: 'skipped',
      detail,
    });
    return;
  }

  const session = await createHarnessSession(['--enable-write', '--enable-nini']);
  const state = createSandboxState();

  try {
    const listed = await session.client.listTools();
    const availableNames = new Set(listed.tools.map((tool) => tool.name));
    for (const testCase of sandboxFullToolCases) {
      if (!availableNames.has(testCase.name)) {
        throw new Error(`Sandbox phase expected tool "${testCase.name}" to be exposed.`);
      }
    }

    await assertSandboxBudgetPresent(session, state);

    for (const testCase of sandboxFullToolCases) {
      const args = await buildSandboxArgs(testCase.name, state);
      const result = await runRecordedCase(session, testCase, args, results);

      if (result.status === 'failed') {
        throw new Error(`Sandbox smoke failed at ${testCase.name}.`);
      }

      await captureSandboxSideEffects(testCase.name, result.detail, state, session);
    }
  } finally {
    await bestEffortSandboxCleanup(session, state);
    await session.close();
  }
}

function printSummary(results: SmokeResult[]): void {
  const passed = results.filter((result) => result.status === 'passed').length;
  const failed = results.filter((result) => result.status === 'failed').length;
  const skipped = results.filter((result) => result.status === 'skipped').length;

  console.log(`\n[summary] passed=${passed} failed=${failed} skipped=${skipped}`);

  if (failed > 0) {
    for (const failure of results.filter((result) => result.status === 'failed')) {
      console.error(`\n[failed-case] ${failure.phase} :: ${failure.tool}\n${failure.detail}`);
    }
  }
}

async function main(): Promise<void> {
  const results: SmokeResult[] = [];

  await assertSurfaceCounts();

  if (phase === 'live' || phase === 'all') {
    await runLivePhase(results);
  }

  if (phase === 'sandbox' || phase === 'all') {
    await runSandboxPhase(results);
  }

  printSummary(results);

  if (results.some((result) => result.status === 'failed')) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[fatal] ${sanitizeText(message)}`);
  process.exitCode = 1;
});
