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
export type EntityType = 'category' | 'categoryGroup' | 'payee' | 'rule' | 'schedule';

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
 * Data required to create or update a schedule
 */
export interface ScheduleData {
  name: string;
  accountId: string;
  amount: number;
  nextDate: string;
  rule: string;
  payee?: string;
  category?: string;
  notes?: string;
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
 * Schema for schedule data validation
 */
export const ScheduleDataSchema = z.object({
  name: z.string().min(1, 'Schedule name is required'),
  accountId: z.string().uuid('Account ID must be a valid UUID'),
  amount: z.number().int('Amount must be an integer in milliunits'),
  nextDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Next date must be in YYYY-MM-DD format'),
  rule: z.string().min(1, 'Recurrence rule is required'),
  payee: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
});

// ----------------------------
// Discriminated Union Types
// ----------------------------

/**
 * Discriminated union for entity-specific data
 * Enables type-safe handling of different entity types
 */
export type EntityDataUnion =
  | { entityType: 'category'; data: CategoryData }
  | { entityType: 'categoryGroup'; data: CategoryGroupData }
  | { entityType: 'payee'; data: PayeeData }
  | { entityType: 'rule'; data: RuleData }
  | { entityType: 'schedule'; data: ScheduleData };

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
