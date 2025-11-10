/**
 * Pattern-based pre-categorization for known transaction types
 * Handles rule-based categorization before LLM analysis
 */

import { ChaseTransaction } from './types.js';

export interface PatternMatch {
  category: string;
  confidence: 'high' | 'medium' | 'low';
  matched: boolean;
}

/**
 * Attempt to categorize a transaction using pattern matching
 * Returns null if no pattern matches (should use LLM)
 */
export function categorizeByPattern(
  transaction: ChaseTransaction,
  cleanedPayee: string
): PatternMatch | null {
  const { description, type, amount } = transaction;
  const descLower = description.toLowerCase();
  const payeeLower = cleanedPayee.toLowerCase();

  // ===== INCOME PATTERNS =====
  // Requirement 5.1.1: UNIV TX AUSTIN PAYROLL
  if (payeeLower.includes('univ tx austin') && payeeLower.includes('payroll')) {
    return { category: 'Income: Salary', confidence: 'high', matched: true };
  }

  // General payroll patterns
  if (descLower.includes('payroll') || descLower.includes('direct dep')) {
    return { category: 'Income: Salary', confidence: 'high', matched: true };
  }

  // Requirement 5.1.2: Zelle payment received
  if (descLower.includes('zelle payment from')) {
    return { category: 'Income: Personal Transfer', confidence: 'high', matched: true };
  }

  // Requirement 5.1.3: Interest payment
  if (descLower.includes('interest payment') || 
      descLower.includes('interest earned') ||
      (type === 'MISC_CREDIT' && descLower.includes('interest'))) {
    return { category: 'Income: Interest', confidence: 'high', matched: true };
  }

  // Requirement 5.1.4: Refund or fee reversal
  if (type === 'REFUND_TRANSACTION' || 
      descLower.includes('refund') || 
      descLower.includes('fee reversal') ||
      descLower.includes('credit adjustment')) {
    return { category: 'Income: Refund', confidence: 'high', matched: true };
  }

  // ===== EXPENSE PATTERNS =====
  // Requirement 5.2.1 & 5.2.2: BILTPYMTS amount-based logic
  if (payeeLower.includes('biltpymts') || payeeLower.includes('bilt')) {
    if (Math.abs(amount) >= 1000) {
      return { category: 'Housing: Rent', confidence: 'high', matched: true };
    } else {
      // Smaller amounts are likely utilities (gas, etc.)
      return { category: 'Utilities: Gas', confidence: 'medium', matched: true };
    }
  }

  // Requirement 5.2.3: Internet/Cable providers
  if (payeeLower.includes('grande communica') || 
      payeeLower.includes('astound') ||
      payeeLower.includes('grande communications')) {
    return { category: 'Utilities: Internet/Cable', confidence: 'high', matched: true };
  }

  // Requirement 5.2.4: Credit card payments
  if (payeeLower.includes('applecard gsbank') || 
      payeeLower.includes('applecard') ||
      payeeLower.includes('chase credit crd') ||
      payeeLower.includes('credit crd autopay') ||
      (payeeLower.includes('credit card') && type === 'ACH_DEBIT')) {
    return { category: 'Debt Payment: Credit Card', confidence: 'high', matched: true };
  }

  // Requirement 5.2.6: Bank fees
  if (type === 'FEE_TRANSACTION' || 
      descLower.includes('bank fee') || 
      descLower.includes('service fee') ||
      descLower.includes('monthly fee') ||
      descLower.includes('overdraft fee')) {
    return { category: 'Fees: Bank Fees', confidence: 'high', matched: true };
  }

  // Requirement 5.2.7: Account transfers
  if (type === 'ACCT_XFER' || 
      descLower.includes('account transfer') ||
      descLower.includes('transfer to') ||
      descLower.includes('transfer from')) {
    return { category: 'Transfer: Internal', confidence: 'high', matched: true };
  }

  // Savings transfers
  if (payeeLower.includes('savings') && (type === 'ACH_DEBIT' || type === 'ACH_CREDIT')) {
    return { category: 'Transfer: Savings', confidence: 'high', matched: true };
  }

  // Additional common patterns for better categorization
  // Utilities
  if (payeeLower.includes('electric') || payeeLower.includes('power')) {
    return { category: 'Utilities: Electric', confidence: 'high', matched: true };
  }

  if (payeeLower.includes('water') || payeeLower.includes('sewer')) {
    return { category: 'Utilities: Water', confidence: 'high', matched: true };
  }

  if (payeeLower.includes('phone') || payeeLower.includes('wireless') || 
      payeeLower.includes('verizon') || payeeLower.includes('at&t') || 
      payeeLower.includes('t-mobile')) {
    return { category: 'Utilities: Phone', confidence: 'high', matched: true };
  }

  // Transportation
  if (payeeLower.includes('gas station') || payeeLower.includes('fuel') ||
      payeeLower.includes('shell') || payeeLower.includes('exxon') ||
      payeeLower.includes('chevron') || payeeLower.includes('bp ')) {
    return { category: 'Transportation: Gas', confidence: 'high', matched: true };
  }

  // No pattern matched
  return null;
}

/**
 * Check if a transaction should skip LLM categorization
 * (i.e., pattern match has high confidence)
 */
export function shouldSkipLLM(patternMatch: PatternMatch | null): boolean {
  return patternMatch !== null && patternMatch.confidence === 'high';
}
