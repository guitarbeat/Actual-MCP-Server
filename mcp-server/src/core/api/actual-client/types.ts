import api from '@actual-app/api';
import type {
  APIAccountEntity,
  APICategoryEntity,
  APICategoryGroupEntity,
  APIPayeeEntity,
  APIScheduleEntity,
  APITagEntity,
} from '@actual-app/api/@types/loot-core/src/server/api-models.js';

export type ExtendedActualApi = typeof api & {
  createSchedule?: (args: Record<string, unknown>) => Promise<string>;
  updateSchedule?: (
    id: string,
    args: Record<string, unknown>,
    resetNextDate?: boolean,
  ) => Promise<unknown>;
  deleteSchedule?: (id: string) => Promise<unknown>;
  getSchedules?: () => Promise<APIScheduleEntity[]>;
  runBankSync?: (options?: { accountId: string }) => Promise<unknown>;
  getServerVersion?: () => Promise<{ error?: string } | { version: string }>;
  getIDByName?: (args: { type: string; string: string }) => Promise<string>;
  internal?: {
    send?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
    db?: {
      getTransaction?: (id: string) => Promise<HistoricalTransferInternalTransaction | null>;
      all?: (sql: string, params: unknown[]) => Promise<any[]>;
    };
  };
};

export interface HistoricalTransferInternalTransaction {
  id: string;
  account: string;
  amount: number;
  date: string;
  payee?: string | null;
  category?: string | null;
  transfer_id?: string | null;
  is_parent?: boolean | null;
  is_child?: boolean | null;
  starting_balance_flag?: boolean | null;
  tombstone?: boolean | null;
}

export interface HistoricalTransferApplyCandidateResult {
  candidateId: string;
  transactionIds: [string, string];
  status: 'applied' | 'rejected';
  categoriesCleared?: boolean;
  reason?: string;
}

export interface HistoricalTransferApplyResult {
  requestedCandidateCount: number;
  appliedCount: number;
  rejectedCount: number;
  results: HistoricalTransferApplyCandidateResult[];
}

export type ActualReadFreshnessMode = 'cached' | 'strict-live';

export type ActualConnectionStatus = 'disconnected' | 'initializing' | 'ready' | 'error';

export interface ActualConnectionState {
  status: ActualConnectionStatus;
  lastReadyAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  debugError: string | null;
  activeBudgetId: string | null;
}

export interface ActualReadinessStatus extends ActualConnectionState {
  ready: boolean;
  reason: string;
}

export interface ActualReadinessStatusExtended extends ActualReadinessStatus {
  diagnostics: {
    serverUrl: string | null;
    budgetSyncId: boolean;
    hasPassword: boolean;
    hasSessionToken: boolean;
    hasEncryptionPassword: boolean;
    autoSyncMinutes: string | null;
    readFreshnessMode: ActualReadFreshnessMode;
    retrying: boolean;
  };
}

export type {
  APIAccountEntity,
  APICategoryEntity,
  APICategoryGroupEntity,
  APIPayeeEntity,
  APIScheduleEntity,
  APITagEntity,
};
