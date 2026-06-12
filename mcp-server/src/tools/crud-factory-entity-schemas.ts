import { z } from 'zod';
import { RuleDataSchema } from './manage-entity/types.js';

// ----------------------------
// CATEGORY SCHEMAS
// ----------------------------

export const CreateCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be less than 100 characters')
    .describe('Name of the new category (e.g., "Groceries", "Rent").'),
  groupId: z
    .string()
    .uuid('Group ID must be a valid UUID')
    .describe(
      'UUID of the category group to add the category to. Use get-grouped-categories to find group IDs.',
    ),
});

export const UpdateCategorySchema = z.object({
  id: z
    .string()
    .uuid('Category ID must be a valid UUID')
    .describe('UUID of the category to update.'),
  name: z
    .string()
    .min(1)
    .max(100, 'Category name must be less than 100 characters')
    .optional()
    .describe('New name for the category.'),
  groupId: z
    .string()
    .uuid()
    .optional()
    .describe('New category group UUID to move the category to.'),
});

export const DeleteCategorySchema = z.object({
  id: z
    .string()
    .uuid('Category ID must be a valid UUID')
    .describe('UUID of the category to delete.'),
});

// ----------------------------
// PAYEE SCHEMAS
// ----------------------------

export const CreatePayeeSchema = z.object({
  name: z
    .string()
    .min(1, 'Payee name is required')
    .max(100, 'Payee name must be less than 100 characters')
    .describe('Name of the new payee/merchant.'),
  transferAccount: z.string().optional().describe('Account UUID if this is a transfer payee.'),
});

export const UpdatePayeeSchema = z.object({
  id: z.string().uuid('Payee ID must be a valid UUID').describe('UUID of the payee to update.'),
  name: z
    .string()
    .min(1)
    .max(100, 'Payee name must be less than 100 characters')
    .optional()
    .describe('New name for the payee.'),
  transferAccount: z.string().optional().describe('New account UUID for transfer payee.'),
});

export const DeletePayeeSchema = z.object({
  id: z.string().uuid('Payee ID must be a valid UUID').describe('UUID of the payee to delete.'),
});

// ----------------------------
// TAG SCHEMAS
// ----------------------------

export const CreateTagSchema = z.object({
  tag: z
    .string()
    .min(1, 'Tag label is required')
    .max(100, 'Tag label must be less than 100 characters')
    .describe('Visible tag label (e.g., "reimbursable", "taxes", "vacation").'),
  color: z
    .string()
    .max(50, 'Tag color must be less than 50 characters')
    .nullable()
    .optional()
    .describe('Optional color string, typically a hex value like "#ff0000".'),
  description: z
    .string()
    .max(500, 'Tag description must be less than 500 characters')
    .nullable()
    .optional()
    .describe('Optional description explaining when to use the tag.'),
});

export const UpdateTagSchema = z.object({
  id: z.string().uuid('Tag ID must be a valid UUID').describe('UUID of the tag to update.'),
  tag: z
    .string()
    .min(1, 'Tag label is required')
    .max(100, 'Tag label must be less than 100 characters')
    .optional()
    .describe('New tag label.'),
  color: z
    .string()
    .max(50, 'Tag color must be less than 50 characters')
    .nullable()
    .optional()
    .describe('New optional color string, typically a hex value like "#00ff00".'),
  description: z
    .string()
    .max(500, 'Tag description must be less than 500 characters')
    .nullable()
    .optional()
    .describe('New optional description.'),
});

export const DeleteTagSchema = z.object({
  id: z.string().uuid('Tag ID must be a valid UUID').describe('UUID of the tag to delete.'),
});

// ----------------------------
// ACCOUNT SCHEMAS
// ----------------------------

export const CreateAccountSchema = z.object({
  name: z
    .string()
    .min(1, 'Account name is required')
    .max(100, 'Account name must be less than 100 characters')
    .describe('Display name for the account (e.g., "Chase Checking", "Amazon Card").'),
  type: z
    .enum(['checking', 'savings', 'credit', 'investment', 'mortgage', 'debt', 'other'], {
      errorMap: () => ({
        message:
          'Account type must be one of: checking, savings, credit, investment, mortgage, debt, other',
      }),
    })
    .describe('Account type: checking, savings, credit, investment, mortgage, debt, or other.'),
  offbudget: z
    .boolean()
    .optional()
    .describe('If true, this is a tracking-only account that does not affect budget calculations.'),
  initialBalance: z
    .number()
    .int()
    .optional()
    .describe('Starting balance in cents (e.g., 1000000 = $10,000).'),
  balanceCurrent: z
    .number()
    .int()
    .nullable()
    .optional()
    .describe(
      'Reported bank balance in cents, stored separately from ledger history for reconciliation.',
    ),
});

export const UpdateAccountSchema = z.object({
  id: z
    .string()
    .uuid('Account ID must be a valid UUID')
    .describe('UUID of the account to update. Use get-accounts to find account IDs.'),
  name: z
    .string()
    .min(1)
    .max(100, 'Account name must be less than 100 characters')
    .optional()
    .describe('New display name for the account.'),
  type: z
    .enum(['checking', 'savings', 'credit', 'investment', 'mortgage', 'debt', 'other'])
    .optional()
    .describe('New account type.'),
  offbudget: z
    .boolean()
    .optional()
    .describe('Set to true to move off-budget (tracking only), false for on-budget.'),
  balanceCurrent: z
    .number()
    .int()
    .nullable()
    .optional()
    .describe('Updated reported bank balance in cents, or null to clear it.'),
});

export const DeleteAccountSchema = z.object({
  id: z
    .string()
    .uuid('Account ID must be a valid UUID')
    .describe('UUID of the account to delete. Use get-accounts to find account IDs.'),
});

// ----------------------------
// RULE SCHEMAS
// ----------------------------

export const UpdateRuleSchema = z
  .object({
    id: z
      .string()
      .uuid('Rule ID must be a valid UUID')
      .describe('UUID of the rule to update. Use get-rules to find rule IDs.'),
  })
  .merge(RuleDataSchema.partial());

export const DeleteRuleSchema = z.object({
  id: z
    .string()
    .uuid('Rule ID must be a valid UUID')
    .describe('UUID of the rule to delete. Use get-rules to find rule IDs.'),
});

// ----------------------------
// CATEGORY GROUP SCHEMAS
// ----------------------------

export const CreateCategoryGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Category group name is required')
    .max(100, 'Category group name must be less than 100 characters')
    .describe('Name of the new category group (e.g., "Fixed Expenses").'),
});

export const UpdateCategoryGroupSchema = z.object({
  id: z
    .string()
    .uuid('Category group ID must be a valid UUID')
    .describe('UUID of the category group to update.'),
  name: z
    .string()
    .min(1)
    .max(100, 'Category group name must be less than 100 characters')
    .optional()
    .describe('New name for the category group.'),
});

export const DeleteCategoryGroupSchema = z.object({
  id: z
    .string()
    .uuid('Category group ID must be a valid UUID')
    .describe('UUID of the category group to delete.'),
});
