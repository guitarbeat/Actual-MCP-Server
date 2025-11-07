// ----------------------------
// MANAGE-ENTITY TYPES
// Type definitions and schemas for the manage-entity tool
// ----------------------------

import { z } from 'zod';
import type { Operation } from './entity-handlers/base-handler.js';

// ----------------------------
// Entity Type Discriminator
// ----------------------------

/**
 * Supported entity types for the manage-entity tool
 */
export type EntityType = 'category' | 'categoryGroup' | 'payee' | 'rule' | 'schedule' | 'transaction' | 'account';

// ----------------------------
// Entity-Specific Data Types
// ----------------------------

/**
 * Data required to create or update a category
 */
export interface CategoryData {
  name: string;
  groupId: string;
}

/**
 * Data required to create or update a category group
 */
export interface CategoryGroupData {
  name: string;
}

/**
 * Data required to create or update a payee
 */
export interface PayeeData {
  name: string;
  transferAccount?: string;
}

/**
 * Rule condition structure
 */
export interface RuleCondition {
  field: 'account' | 'category' | 'date' | 'payee' | 'amount' | 'imported_payee';
  op:
    | 'is'
    | 'isNot'
    | 'oneOf'
    | 'notOneOf'
    | 'onBudget'
    | 'offBudget'
    | 'isapprox'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'isbetween'
    | 'contains'
    | 'doesNotContain'
    | 'matches'
    | 'hasTags';
  value: string | number | string[] | number[];
}

/**
 * Rule action structure
 */
export interface RuleAction {
  field: 'account' | 'category' | 'date' | 'payee' | 'amount' | 'cleared' | 'notes' | null;
  op: 'set' | 'prepend-notes' | 'append-notes' | 'set-split-amount';
  value: boolean | string | number | null;
  options?: {
    splitIndex?: number;
    method?: 'fixed-amount' | 'fixed-percent' | 'remainder';
  };
}

/**
 * Data required to create or update a rule
 */
export interface RuleData {
  stage?: string | null;
  conditionsOp: 'and' | 'or';
  conditions: RuleCondition[];
  actions: RuleAction[];
}

/**
 * Recurrence pattern for schedule dates
 */
export interface RecurPattern {
  type: 'day' | 'weekday' | 'weekend' | 'dayOfMonth' | 'dayOfWeek';
  value: number | number[];
}

/**
 * Recurrence configuration for schedules
 */
export interface RecurConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number; // Defaults to 1
  patterns?: RecurPattern[];
  skipWeekend?: boolean;
  start: string; // ISO date string
  endMode: 'never' | 'after_n_occurrences' | 'on_date';
  endOccurrences?: number; // Required if endMode is 'after_n_occurrences'
  endDate?: string; // Required if endMode is 'on_date' (ISO date string)
  weekendSolveMode?: 'before' | 'after'; // If skipWeekend is true
}

/**
 * Data required to create or update a schedule
 * Matches Actual Budget API schedule structure
 * Supports name resolution for account, payee, and category (like TransactionData)
 */
export interface ScheduleData {
  name?: string; // Optional but recommended, must be unique
  account?: string | null; // Optional, name or ID (use accountId for convenience)
  accountId?: string; // Convenience field - maps to account, name or ID
  amount?: number | { num1: number; num2: number }; // Optional, dollars or cents (auto-detected)
  amountOp?: 'is' | 'isapprox' | 'isbetween'; // Optional, controls amount interpretation
  date: string | RecurConfig; // REQUIRED - date string OR RecurConfig
  payee?: string | null; // Optional, name or ID
  category?: string | null; // Optional, name or ID
  notes?: string; // Optional
  posts_transaction?: boolean; // Optional, defaults to false
  // DO NOT include: rule, next_date, completed (auto-managed by API)
}

// ----------------------------
// Zod Schemas for Validation
// ----------------------------

/**
 * Schema for category data validation
 */
export const CategoryDataSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  groupId: z.string().uuid('Group ID must be a valid UUID'),
});

/**
 * Schema for category group data validation
 */
export const CategoryGroupDataSchema = z.object({
  name: z.string().min(1, 'Category group name is required'),
});

/**
 * Schema for payee data validation
 */
export const PayeeDataSchema = z.object({
  name: z.string().min(1, 'Payee name is required'),
  transferAccount: z.string().uuid('Transfer account must be a valid UUID').optional(),
});

/**
 * Schema for rule condition validation
 */
export const RuleConditionSchema = z.object({
  field: z.enum(['account', 'category', 'date', 'payee', 'amount', 'imported_payee']),
  op: z.enum([
    'is',
    'isNot',
    'oneOf',
    'notOneOf',
    'onBudget',
    'offBudget',
    'isapprox',
    'gt',
    'gte',
    'lt',
    'lte',
    'isbetween',
    'contains',
    'doesNotContain',
    'matches',
    'hasTags',
  ]),
  value: z.union([z.string(), z.number(), z.array(z.string()), z.array(z.number())]),
});

/**
 * Schema for rule action validation
 */
export const RuleActionSchema = z.object({
  field: z.enum(['account', 'category', 'date', 'payee', 'amount', 'cleared', 'notes']).nullable(),
  op: z.enum(['set', 'prepend-notes', 'append-notes', 'set-split-amount']),
  value: z.union([z.boolean(), z.string(), z.number(), z.null()]),
  options: z
    .object({
      splitIndex: z.number().optional(),
      method: z.enum(['fixed-amount', 'fixed-percent', 'remainder']).optional(),
    })
    .optional(),
});

/**
 * Schema for rule data validation
 */
export const RuleDataSchema = z.object({
  stage: z.enum(['pre', 'post']).nullable().optional(),
  conditionsOp: z.enum(['and', 'or']),
  conditions: z.array(RuleConditionSchema).min(1, 'At least one condition is required'),
  actions: z.array(RuleActionSchema).min(1, 'At least one action is required'),
});

/**
 * Schema for recurrence pattern validation
 */
export const RecurPatternSchema = z.object({
  type: z.enum(['day', 'weekday', 'weekend', 'dayOfMonth', 'dayOfWeek']),
  value: z.union([z.number(), z.array(z.number())]),
});

/**
 * Schema for recurrence configuration validation
 */
export const RecurConfigSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  interval: z.number().int().positive().optional(),
  patterns: z.array(RecurPatternSchema).optional(),
  skipWeekend: z.boolean().optional(),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Start date must be an ISO date string'),
  endMode: z.enum(['never', 'after_n_occurrences', 'on_date']),
  endOccurrences: z.number().int().positive().optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, 'End date must be an ISO date string')
    .optional(),
  weekendSolveMode: z.enum(['before', 'after']).optional(),
});

/**
 * Schema for schedule data validation
 * Supports name resolution for account, payee, and category (like TransactionData)
 */
export const ScheduleDataSchema = z.object({
  name: z.string().min(1, 'Schedule name is recommended').optional(),
  account: z.string().min(1, 'Account name or ID is required').nullable().optional(), // Name or ID
  accountId: z.string().min(1, 'Account name or ID is required').optional(), // Name or ID (convenience field)
  amount: z
    .union([
      z.number(), // Dollars or cents (auto-detected, like transactions)
      z.object({
        num1: z.number(),
        num2: z.number(),
      }),
    ])
    .optional(),
  amountOp: z.enum(['is', 'isapprox', 'isbetween']).optional(),
  date: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'), RecurConfigSchema]),
  payee: z.string().min(1, 'Payee name or ID is required').nullable().optional(), // Name or ID
  category: z.string().min(1, 'Category name or ID is required').nullable().optional(), // Name or ID
  notes: z.string().optional(),
  posts_transaction: z.boolean().optional(),
});

// ----------------------------
// Discriminated Union Types
// ----------------------------

/**
 * Data required to create or update a transaction
 * Supports flattened schema with name resolution
 */
export interface TransactionData {
  account?: string; // Name or ID
  date?: string; // YYYY-MM-DD format
  amount?: number; // Dollars or cents (auto-detected)
  payee?: string; // Name or ID
  category?: string; // Name or ID
  notes?: string;
  cleared?: boolean;
  subtransactions?: Array<{
    amount: number;
    category?: string;
    notes?: string;
  }>;
}

/**
 * Account type enum
 */
export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'mortgage' | 'debt' | 'other';

/**
 * Data required to create or update an account
 */
export interface AccountData {
  name?: string;
  type?: AccountType;
  offbudget?: boolean;
  initialBalance?: number; // For create operation only, in cents
}

/**
 * Close account data structure
 */
export interface CloseAccountData {
  transferAccountId?: string;
  transferCategoryId?: string;
}

/**
 * Discriminated union for entity-specific data
 * Enables type-safe handling of different entity types
 */
export type EntityDataUnion =
  | { entityType: 'category'; data: CategoryData }
  | { entityType: 'categoryGroup'; data: CategoryGroupData }
  | { entityType: 'payee'; data: PayeeData }
  | { entityType: 'rule'; data: RuleData }
  | { entityType: 'schedule'; data: ScheduleData }
  | { entityType: 'transaction'; data: TransactionData }
  | { entityType: 'account'; data: AccountData };

// ----------------------------
// Main Tool Arguments
// ----------------------------

/**
 * Arguments for the manage-entity tool
 * Uses discriminated union for type-safe entity handling
 */
export interface ManageEntityArgs {
  entityType: EntityType;
  operation: Operation;
  id?: string;
  data?: unknown;
}

/**
 * Schema for manage-entity arguments validation
 */
export const schema = z.object({
  entityType: z.enum(['category', 'categoryGroup', 'payee', 'rule', 'schedule']),
  operation: z.enum(['create', 'update', 'delete']),
  id: z.string().uuid('Entity ID must be a valid UUID').optional(),
  data: z.any().optional(),
});

/**
 * Type-safe parsed arguments with proper type narrowing
 */
export type ParsedManageEntityArgs = z.infer<typeof schema>;
