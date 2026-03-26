export type SmokePhase = 'live-readonly' | 'sandbox-full';
export type SmokeExpectedOutcome = 'success' | 'expected-guarded-failure';

export interface ToolSmokeCase {
  name: string;
  phase: SmokePhase;
  setupDependencies: string[];
  expectedOutcome: SmokeExpectedOutcome;
}

export const liveReadonlyToolCases: ToolSmokeCase[] = [
  {
    name: 'balance-history',
    phase: 'live-readonly',
    setupDependencies: ['live-context.account'],
    expectedOutcome: 'success',
  },
  {
    name: 'get-account-balance',
    phase: 'live-readonly',
    setupDependencies: ['live-context.account'],
    expectedOutcome: 'success',
  },
  {
    name: 'get-accounts',
    phase: 'live-readonly',
    setupDependencies: ['live-context'],
    expectedOutcome: 'success',
  },
  {
    name: 'get-budget-month',
    phase: 'live-readonly',
    setupDependencies: ['live-context.month'],
    expectedOutcome: 'success',
  },
  {
    name: 'get-financial-insights',
    phase: 'live-readonly',
    setupDependencies: ['live-context.month'],
    expectedOutcome: 'success',
  },
  {
    name: 'get-grouped-categories',
    phase: 'live-readonly',
    setupDependencies: ['live-context'],
    expectedOutcome: 'success',
  },
  {
    name: 'get-payees',
    phase: 'live-readonly',
    setupDependencies: ['live-context'],
    expectedOutcome: 'success',
  },
  {
    name: 'get-rules',
    phase: 'live-readonly',
    setupDependencies: ['live-context'],
    expectedOutcome: 'success',
  },
  {
    name: 'get-schedules',
    phase: 'live-readonly',
    setupDependencies: ['live-context'],
    expectedOutcome: 'success',
  },
  {
    name: 'get-transactions',
    phase: 'live-readonly',
    setupDependencies: ['live-context.account', 'live-context.date-range'],
    expectedOutcome: 'success',
  },
  {
    name: 'audit-historical-transfers',
    phase: 'live-readonly',
    setupDependencies: ['live-context.date-range'],
    expectedOutcome: 'success',
  },
  {
    name: 'monthly-summary',
    phase: 'live-readonly',
    setupDependencies: ['live-context'],
    expectedOutcome: 'success',
  },
  {
    name: 'recommend-budget-plan',
    phase: 'live-readonly',
    setupDependencies: ['live-context.month'],
    expectedOutcome: 'success',
  },
  {
    name: 'spending-by-category',
    phase: 'live-readonly',
    setupDependencies: ['live-context.account', 'live-context.date-range'],
    expectedOutcome: 'success',
  },
  {
    name: 'get-budget-files',
    phase: 'live-readonly',
    setupDependencies: ['live-context'],
    expectedOutcome: 'success',
  },
];

export const sandboxFullToolCases: ToolSmokeCase[] = [
  {
    name: 'switch-budget',
    phase: 'sandbox-full',
    setupDependencies: ['sandbox-budget-id'],
    expectedOutcome: 'success',
  },
  {
    name: 'create-category-group',
    phase: 'sandbox-full',
    setupDependencies: ['sandbox-prefix'],
    expectedOutcome: 'success',
  },
  {
    name: 'update-category-group',
    phase: 'sandbox-full',
    setupDependencies: ['create-category-group'],
    expectedOutcome: 'success',
  },
  {
    name: 'create-category',
    phase: 'sandbox-full',
    setupDependencies: ['update-category-group'],
    expectedOutcome: 'success',
  },
  {
    name: 'update-category',
    phase: 'sandbox-full',
    setupDependencies: ['create-category'],
    expectedOutcome: 'success',
  },
  {
    name: 'create-account',
    phase: 'sandbox-full',
    setupDependencies: ['sandbox-prefix'],
    expectedOutcome: 'success',
  },
  {
    name: 'update-account',
    phase: 'sandbox-full',
    setupDependencies: ['create-account'],
    expectedOutcome: 'success',
  },
  {
    name: 'create-payee',
    phase: 'sandbox-full',
    setupDependencies: ['sandbox-prefix'],
    expectedOutcome: 'success',
  },
  {
    name: 'update-payee',
    phase: 'sandbox-full',
    setupDependencies: ['create-payee'],
    expectedOutcome: 'success',
  },
  {
    name: 'create-rule',
    phase: 'sandbox-full',
    setupDependencies: ['update-category', 'update-payee'],
    expectedOutcome: 'success',
  },
  {
    name: 'update-rule',
    phase: 'sandbox-full',
    setupDependencies: ['create-rule'],
    expectedOutcome: 'success',
  },
  {
    name: 'merge-payees',
    phase: 'sandbox-full',
    setupDependencies: ['create-payee'],
    expectedOutcome: 'success',
  },
  {
    name: 'create-schedule',
    phase: 'sandbox-full',
    setupDependencies: ['update-account', 'update-category', 'update-payee'],
    expectedOutcome: 'success',
  },
  {
    name: 'update-schedule',
    phase: 'sandbox-full',
    setupDependencies: ['create-schedule'],
    expectedOutcome: 'success',
  },
  {
    name: 'create-transaction',
    phase: 'sandbox-full',
    setupDependencies: ['update-account', 'update-category', 'update-payee'],
    expectedOutcome: 'success',
  },
  {
    name: 'audit-historical-transfers',
    phase: 'sandbox-full',
    setupDependencies: ['create-transaction'],
    expectedOutcome: 'success',
  },
  {
    name: 'apply-historical-transfers',
    phase: 'sandbox-full',
    setupDependencies: ['audit-historical-transfers'],
    expectedOutcome: 'success',
  },
  {
    name: 'update-transaction',
    phase: 'sandbox-full',
    setupDependencies: ['create-transaction'],
    expectedOutcome: 'success',
  },
  {
    name: 'set-account-starting-balance',
    phase: 'sandbox-full',
    setupDependencies: ['create-account'],
    expectedOutcome: 'success',
  },
  {
    name: 'set-budget',
    phase: 'sandbox-full',
    setupDependencies: ['update-category'],
    expectedOutcome: 'success',
  },
  {
    name: 'apply-budget-plan',
    phase: 'sandbox-full',
    setupDependencies: ['update-category'],
    expectedOutcome: 'success',
  },
  {
    name: 'reconcile-account',
    phase: 'sandbox-full',
    setupDependencies: ['create-transaction'],
    expectedOutcome: 'success',
  },
  {
    name: 'hold-budget',
    phase: 'sandbox-full',
    setupDependencies: ['update-category'],
    expectedOutcome: 'success',
  },
  {
    name: 'reset-budget-hold',
    phase: 'sandbox-full',
    setupDependencies: ['hold-budget'],
    expectedOutcome: 'success',
  },
  {
    name: 'import-transaction-batch',
    phase: 'sandbox-full',
    setupDependencies: ['update-account'],
    expectedOutcome: 'success',
  },
  {
    name: 'import-transactions',
    phase: 'sandbox-full',
    setupDependencies: ['update-account'],
    expectedOutcome: 'expected-guarded-failure',
  },
  {
    name: 'close-account',
    phase: 'sandbox-full',
    setupDependencies: ['create-account'],
    expectedOutcome: 'success',
  },
  {
    name: 'reopen-account',
    phase: 'sandbox-full',
    setupDependencies: ['close-account'],
    expectedOutcome: 'success',
  },
  {
    name: 'delete-account',
    phase: 'sandbox-full',
    setupDependencies: ['create-account'],
    expectedOutcome: 'success',
  },
  {
    name: 'delete-schedule',
    phase: 'sandbox-full',
    setupDependencies: ['update-schedule'],
    expectedOutcome: 'success',
  },
  {
    name: 'delete-transaction',
    phase: 'sandbox-full',
    setupDependencies: ['update-transaction'],
    expectedOutcome: 'success',
  },
  {
    name: 'delete-rule',
    phase: 'sandbox-full',
    setupDependencies: ['update-rule'],
    expectedOutcome: 'success',
  },
  {
    name: 'delete-payee',
    phase: 'sandbox-full',
    setupDependencies: ['merge-payees', 'update-payee', 'delete-rule', 'delete-schedule'],
    expectedOutcome: 'success',
  },
  {
    name: 'delete-category',
    phase: 'sandbox-full',
    setupDependencies: ['delete-rule', 'delete-schedule', 'delete-transaction'],
    expectedOutcome: 'success',
  },
  {
    name: 'delete-category-group',
    phase: 'sandbox-full',
    setupDependencies: ['delete-category'],
    expectedOutcome: 'success',
  },
];
