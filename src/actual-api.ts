import api from '@actual-app/api';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { BudgetFile } from './types.js';
import {
  APIAccountEntity,
  APICategoryEntity,
  APICategoryGroupEntity,
  APIPayeeEntity,
} from '@actual-app/api/@types/loot-core/src/server/api-models.js';
import { RuleEntity, TransactionEntity } from '@actual-app/api/@types/loot-core/src/types/models/index.js';

const DEFAULT_DATA_DIR: string = path.resolve(os.homedir() || '.', '.actual');

// API initialization state
let initialized = false;
let initializing = false;
let initializationError: Error | null = null;

/**
 * Initialize the Actual Budget API
 */
export async function initActualApi(): Promise<void> {
  if (initialized) return;
  if (initializing) {
    // Wait for initialization to complete if already in progress
    while (initializing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (initializationError) throw initializationError;
    return;
  }

  initializing = true;
  initializationError = null;
  try {
    console.error('Initializing Actual Budget API...');
    const dataDir = process.env.ACTUAL_DATA_DIR || DEFAULT_DATA_DIR;
    console.error(`[LOG] ACTUAL_DATA_DIR: ${process.env.ACTUAL_DATA_DIR}`);
    console.error(`[LOG] DEFAULT_DATA_DIR: ${DEFAULT_DATA_DIR}`);
    console.error(`[LOG] Using dataDir: ${dataDir}`);
    console.error(`[LOG] ACTUAL_SERVER_URL: ${process.env.ACTUAL_SERVER_URL}`);
    console.error(`[LOG] ACTUAL_PASSWORD: ${process.env.ACTUAL_PASSWORD ? '***' : '(empty)'}`);
    console.error(`[LOG] ACTUAL_BUDGET_SYNC_ID: ${process.env.ACTUAL_BUDGET_SYNC_ID}`);
    if (!fs.existsSync(dataDir)) {
      console.error(`[LOG] dataDir does not exist, creating...`);
      fs.mkdirSync(dataDir, { recursive: true });
    }
    console.log(
      JSON.stringify({
        dataDir,
        serverURL: process.env.ACTUAL_SERVER_URL,
        password: process.env.ACTUAL_PASSWORD ? '***' : '(empty)',
      })
    );
    await api.init({
      dataDir,
      serverURL: process.env.ACTUAL_SERVER_URL,
      password: process.env.ACTUAL_PASSWORD,
    });

    const budgets: BudgetFile[] = await api.getBudgets();
    console.error(`[LOG] Budgets found: ${budgets.length}`);
    if (!budgets || budgets.length === 0) {
      throw new Error('No budgets found. Please create a budget in Actual first.');
    }

    // Use specified budget or the first one
    const budgetId: string = process.env.ACTUAL_BUDGET_SYNC_ID || budgets[0].cloudFileId || budgets[0].id || '';
    const budgetPassword: string | undefined = process.env.ACTUAL_BUDGET_PASSWORD;
    console.error(`[LOG] Using budgetId: ${budgetId}`);
    console.error(`[LOG] Loading budget: ${budgetId}`);
    console.error(`[LOG] ACTUAL_BUDGET_PASSWORD: ${budgetPassword ? '***' : '(not set)'}`);
    try {
      if (budgetPassword) {
        await api.downloadBudget(budgetId, { password: budgetPassword });
      } else {
        await api.downloadBudget(budgetId);
      }
      console.error('[LOG] Budget downloaded successfully');
    } catch (budgetError) {
      console.error('[LOG] Error downloading budget:', budgetError);
      throw budgetError;
    }

    initialized = true;
    console.error('Actual Budget API initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Actual Budget API:', error);
    initializationError = error instanceof Error ? error : new Error(String(error));
    throw initializationError;
  } finally {
    initializing = false;
  }
}

/**
 * Shutdown the Actual Budget API
 */
export async function shutdownActualApi(): Promise<void> {
  if (!initialized) return;
  await api.shutdown();
  initialized = false;
}

// ----------------------------
// FETCH
// ----------------------------

/**
 * Get all accounts (ensures API is initialized)
 */
export async function getAccounts(): Promise<APIAccountEntity[]> {
  await initActualApi();
  return api.getAccounts();
}

/**
 * Get all categories (ensures API is initialized)
 */
export async function getCategories(): Promise<APICategoryEntity[]> {
  await initActualApi();
  return api.getCategories();
}

/**
 * Get all category groups (ensures API is initialized)
 */
export async function getCategoryGroups(): Promise<APICategoryGroupEntity[]> {
  await initActualApi();
  return api.getCategoryGroups();
}

/**
 * Get all payees (ensures API is initialized)
 */
export async function getPayees(): Promise<APIPayeeEntity[]> {
  await initActualApi();
  return api.getPayees();
}

/**
 * Get transactions for a specific account and date range (ensures API is initialized)
 */
export async function getTransactions(accountId: string, start: string, end: string): Promise<TransactionEntity[]> {
  await initActualApi();
  return api.getTransactions(accountId, start, end);
}

/**
 * Get all rules (ensures API is initialized)
 */
export async function getRules(): Promise<RuleEntity[]> {
  await initActualApi();
  return api.getRules();
}

/**
 * Get account balance for a specific account and date (ensures API is initialized)
 */
export async function getAccountBalance(accountId: string, date?: string): Promise<number> {
  await initActualApi();
  return api.getAccountBalance(accountId, date);
}

// ----------------------------
// ACTION
// ----------------------------

/**
 * Create a new payee (ensures API is initialized)
 */
export async function createPayee(args: Record<string, unknown>): Promise<string> {
  await initActualApi();
  return api.createPayee(args);
}

/**
 * Update a payee (ensures API is initialized)
 */
export async function updatePayee(id: string, args: Record<string, unknown>): Promise<unknown> {
  await initActualApi();
  return api.updatePayee(id, args);
}

/**
 * Delete a payee (ensures API is initialized)
 */
export async function deletePayee(id: string): Promise<unknown> {
  await initActualApi();
  return api.deletePayee(id);
}

/**
 * Create a new rule (ensures API is initialized)
 */
export async function createRule(args: Record<string, unknown>): Promise<RuleEntity> {
  await initActualApi();
  return api.createRule(args);
}

/**
 * Update a rule (ensures API is initialized)
 */
export async function updateRule(args: Record<string, unknown>): Promise<RuleEntity> {
  await initActualApi();
  return api.updateRule(args);
}

/**
 * Delete a rule (ensures API is initialized)
 */
export async function deleteRule(id: string): Promise<boolean> {
  await initActualApi();
  return api.deleteRule(id);
}

/**
 * Create a new category (ensures API is initialized)
 */
export async function createCategory(args: Record<string, unknown>): Promise<string> {
  await initActualApi();
  return api.createCategory(args);
}

/**
 * Update a category (ensures API is initialized)
 */
export async function updateCategory(id: string, args: Record<string, unknown>): Promise<unknown> {
  await initActualApi();
  return api.updateCategory(id, args);
}

/**
 * Delete a category (ensures API is initialized)
 */
export async function deleteCategory(id: string): Promise<{ error?: string }> {
  await initActualApi();
  return api.deleteCategory(id);
}

/**
 * Create a new category group (ensures API is initialized)
 */
export async function createCategoryGroup(args: Record<string, unknown>): Promise<string> {
  await initActualApi();
  return api.createCategoryGroup(args);
}

/**
 * Update a category group (ensures API is initialized)
 */
export async function updateCategoryGroup(id: string, args: Record<string, unknown>): Promise<unknown> {
  await initActualApi();
  return api.updateCategoryGroup(id, args);
}

/**
 * Delete a category group (ensures API is initialized)
 */
export async function deleteCategoryGroup(id: string): Promise<unknown> {
  await initActualApi();
  return api.deleteCategoryGroup(id);
}

/**
 * Add transactions to an account (ensures API is initialized)
 */
export async function addTransactions(
  accountId: string,
  transactions: Array<{
    date: string;
    amount: number;
    payee?: string | null;
    category?: string | null;
    notes?: string;
    cleared?: boolean;
  }>,
  options?: { learnCategories?: boolean; runTransfers?: boolean }
): Promise<void> {
  await initActualApi();
  await api.addTransactions(accountId, transactions, options);
}

/**
 * Import transactions with duplicate detection and rule execution (ensures API is initialized)
 */
export async function importTransactions(
  accountId: string,
  transactions: Array<{
    date: string;
    amount: number;
    payee?: string | null;
    payee_name?: string;
    imported_payee?: string;
    category?: string | null;
    notes?: string;
    imported_id?: string;
    cleared?: boolean;
    subtransactions?: Array<{
      amount: number;
      category?: string | null;
      notes?: string;
    }>;
  }>
): Promise<{ errors?: string[]; added: string[]; updated: string[] }> {
  await initActualApi();
  return api.importTransactions(accountId, transactions);
}

/**
 * Create a new account (ensures API is initialized)
 */
export async function createAccount(args: Record<string, unknown>): Promise<string> {
  await initActualApi();
  return api.createAccount(args);
}

/**
 * Update an account (ensures API is initialized)
 */
export async function updateAccount(id: string, args: Record<string, unknown>): Promise<unknown> {
  await initActualApi();
  return api.updateAccount(id, args);
}

/**
 * Close an account (ensures API is initialized)
 */
export async function closeAccount(id: string): Promise<unknown> {
  await initActualApi();
  return api.closeAccount(id);
}

/**
 * Reopen a closed account (ensures API is initialized)
 */
export async function reopenAccount(id: string): Promise<unknown> {
  await initActualApi();
  return api.reopenAccount(id);
}

/**
 * Delete an account (ensures API is initialized)
 */
export async function deleteAccount(id: string): Promise<unknown> {
  await initActualApi();
  return api.deleteAccount(id);
}

/**
 * Get all budget months (ensures API is initialized)
 */
export async function getBudgetMonths(): Promise<string[]> {
  await initActualApi();
  return api.getBudgetMonths();
}

/**
 * Get budget data for a specific month (ensures API is initialized)
 */
export async function getBudgetMonth(month: string): Promise<unknown> {
  await initActualApi();
  return api.getBudgetMonth(month);
}

/**
 * Set budget amount for a category in a specific month (ensures API is initialized)
 */
export async function setBudgetAmount(month: string, categoryId: string, amount: number): Promise<unknown> {
  await initActualApi();
  return api.setBudgetAmount(month, categoryId, amount);
}

/**
 * Set budget carryover for a category in a specific month (ensures API is initialized)
 */
export async function setBudgetCarryover(month: string, categoryId: string, flag: boolean): Promise<unknown> {
  await initActualApi();
  return api.setBudgetCarryover(month, categoryId, flag);
}

/**
 * Hold budget amount for next month (ensures API is initialized)
 */
export async function holdBudgetForNextMonth(month: string, amount: number): Promise<unknown> {
  await initActualApi();
  return api.holdBudgetForNextMonth(month, amount);
}

/**
 * Reset budget hold for a specific month (ensures API is initialized)
 */
export async function resetBudgetHold(month: string): Promise<unknown> {
  await initActualApi();
  return api.resetBudgetHold(month);
}

/**
 * Create a new schedule (ensures API is initialized)
 */
export async function createSchedule(args: Record<string, unknown>): Promise<string> {
  await initActualApi();
  return api.createSchedule(args);
}

/**
 * Update a schedule (ensures API is initialized)
 */
export async function updateSchedule(id: string, args: Record<string, unknown>): Promise<unknown> {
  await initActualApi();
  return api.updateSchedule(id, args);
}

/**
 * Delete a schedule (ensures API is initialized)
 */
export async function deleteSchedule(id: string): Promise<unknown> {
  await initActualApi();
  return api.deleteSchedule(id);
}

/**
 * Get all schedules (ensures API is initialized)
 */
export async function getSchedules(): Promise<unknown[]> {
  await initActualApi();
  return api.getSchedules();
}

/**
 * Merge multiple payees into a target payee (ensures API is initialized)
 */
export async function mergePayees(targetId: string, sourceIds: string[]): Promise<unknown> {
  await initActualApi();
  return api.mergePayees(targetId, sourceIds);
}

/**
 * Get rules for a specific payee (ensures API is initialized)
 */
export async function getPayeeRules(payeeId: string): Promise<RuleEntity[]> {
  await initActualApi();
  return api.getPayeeRules(payeeId);
}

/**
 * Get all budgets (ensures API is initialized)
 */
export async function getBudgets(): Promise<BudgetFile[]> {
  await initActualApi();
  return api.getBudgets();
}

/**
 * Download a budget (ensures API is initialized)
 * @param budgetId - The budget sync ID
 * @param password - Optional password for end-to-end encrypted budgets
 */
export async function downloadBudget(budgetId: string, password?: string): Promise<void> {
  await initActualApi();
  if (password) {
    await api.downloadBudget(budgetId, { password });
  } else {
    await api.downloadBudget(budgetId);
  }
}

/**
 * Load a budget (ensures API is initialized)
 * Note: This may be the same as downloadBudget in some API versions
 */
export async function loadBudget(budgetId: string): Promise<void> {
  await initActualApi();
  if (typeof api.loadBudget === 'function') {
    await api.loadBudget(budgetId);
  } else {
    // Fallback to downloadBudget if loadBudget doesn't exist
    await api.downloadBudget(budgetId);
  }
}

/**
 * Sync with the server (ensures API is initialized)
 */
export async function sync(): Promise<unknown> {
  await initActualApi();
  if (typeof api.sync === 'function') {
    return api.sync();
  }
  throw new Error('sync method is not available in this version of the API');
}

/**
 * Run bank sync (ensures API is initialized)
 */
export async function runBankSync(accountId?: string): Promise<unknown> {
  await initActualApi();
  if (typeof api.runBankSync === 'function') {
    return api.runBankSync(accountId);
  }
  throw new Error('runBankSync method is not available in this version of the API');
}

/**
 * Run import (ensures API is initialized)
 */
export async function runImport(file: string, importType?: string): Promise<unknown> {
  await initActualApi();
  if (typeof api.runImport === 'function') {
    return api.runImport(file, importType);
  }
  throw new Error('runImport method is not available in this version of the API');
}

/**
 * Batch budget updates (ensures API is initialized)
 */
export async function batchBudgetUpdates(updates: Array<Record<string, unknown>>): Promise<unknown> {
  await initActualApi();
  if (typeof api.batchBudgetUpdates === 'function') {
    return api.batchBudgetUpdates(updates);
  }
  throw new Error('batchBudgetUpdates method is not available in this version of the API');
}

/**
 * Run an ActualQL query (ensures API is initialized)
 */
export async function runQuery(query: string): Promise<unknown> {
  await initActualApi();
  if (typeof api.runQuery === 'function') {
    return api.runQuery({ query });
  }
  throw new Error('runQuery method is not available in this version of the API');
}

/**
 * Get server version (ensures API is initialized)
 */
export async function getServerVersion(): Promise<{ error?: string } | { version: string }> {
  await initActualApi();
  if (typeof api.getServerVersion === 'function') {
    return api.getServerVersion();
  }
  throw new Error('getServerVersion method is not available in this version of the API');
}

/**
 * Get ID by name for accounts, categories, payees, or schedules (ensures API is initialized)
 */
export async function getIDByName(type: string, name: string): Promise<string> {
  await initActualApi();
  if (typeof api.getIDByName === 'function') {
    return api.getIDByName({ type, string: name });
  }
  throw new Error('getIDByName method is not available in this version of the API');
}
