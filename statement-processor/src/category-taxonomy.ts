/**
 * Budget category taxonomy and validation
 */

/**
 * Complete category taxonomy for budget categorization
 */
export const CATEGORY_TAXONOMY = {
  income: [
    'Income: Salary',
    'Income: Freelance/Contract',
    'Income: Interest',
    'Income: Refund',
    'Income: Personal Transfer',
    'Income: Other',
  ],
  housing: ['Housing: Rent', 'Housing: Mortgage'],
  utilities: [
    'Utilities: Internet/Cable',
    'Utilities: Electric',
    'Utilities: Gas',
    'Utilities: Water',
    'Utilities: Phone',
  ],
  transportation: [
    'Transportation: Gas',
    'Transportation: Public Transit',
    'Transportation: Parking',
    'Transportation: Car Payment',
  ],
  food: ['Food: Groceries', 'Food: Dining Out', 'Food: Coffee/Snacks'],
  shopping: [
    'Shopping: General',
    'Shopping: Clothing',
    'Shopping: Electronics',
    'Shopping: Home Goods',
  ],
  entertainment: [
    'Entertainment: Streaming Services',
    'Entertainment: Events',
    'Entertainment: Hobbies',
  ],
  healthcare: ['Healthcare: Medical', 'Healthcare: Pharmacy', 'Healthcare: Insurance'],
  debtPayment: [
    'Debt Payment: Credit Card',
    'Debt Payment: Student Loan',
    'Debt Payment: Personal Loan',
  ],
  fees: ['Fees: Bank Fees', 'Fees: Service Fees'],
  transfer: ['Transfer: Internal', 'Transfer: Savings'],
  uncategorized: ['Uncategorized'],
} as const;

/**
 * Flattened list of all valid categories
 */
export const ALL_CATEGORIES = Object.values(CATEGORY_TAXONOMY).flat();

/**
 * Validate if a category is in the taxonomy
 */
export function isValidCategory(category: string): boolean {
  return ALL_CATEGORIES.includes(category as any);
}

/**
 * Normalize category name (trim, handle case variations)
 */
export function normalizeCategory(category: string): string {
  const normalized = category.trim();

  // Try exact match first
  if (isValidCategory(normalized)) {
    return normalized;
  }

  // Try case-insensitive match
  const lowerCategory = normalized.toLowerCase();
  const match = ALL_CATEGORIES.find((cat) => cat.toLowerCase() === lowerCategory);

  return match || 'Uncategorized';
}

/**
 * Get category group for a given category
 */
export function getCategoryGroup(category: string): string | null {
  for (const [group, categories] of Object.entries(CATEGORY_TAXONOMY)) {
    if ((categories as readonly string[]).includes(category)) {
      return group;
    }
  }
  return null;
}

/**
 * Get all categories in a specific group
 */
export function getCategoriesInGroup(group: keyof typeof CATEGORY_TAXONOMY): readonly string[] {
  return CATEGORY_TAXONOMY[group];
}
