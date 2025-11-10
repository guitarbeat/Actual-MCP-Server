/**
 * LLM-based transaction categorization
 */

import { ChaseTransaction, CategorySuggestion } from './types.js';
import { LLMClient } from './llm-client.js';
import { normalizeCategory, ALL_CATEGORIES } from './category-taxonomy.js';

/**
 * Build system prompt with category taxonomy
 */
function buildSystemPrompt(): string {
  return `You are a financial transaction categorization assistant. Your task is to categorize bank transactions into appropriate budget categories.

Available categories:
${ALL_CATEGORIES.join('\n')}

Rules:
1. Respond with ONLY the category name, nothing else
2. Choose the most specific and appropriate category
3. For BILTPYMTS: amounts >= $1000 are typically "Housing: Rent", amounts < $1000 are typically "Utilities: Gas" or other utilities
4. Credit card payments should be "Debt Payment: Credit Card"
5. Account transfers should be "Transfer: Internal" or "Transfer: Savings"
6. Bank fees should be "Fees: Bank Fees"
7. If uncertain, choose the closest match or use "Uncategorized"`;
}

/**
 * Build user prompt for a specific transaction
 */
function buildTransactionPrompt(
  payee: string,
  description: string,
  amount: number,
  type: string,
  date: string
): string {
  const amountStr = amount >= 0 ? `+$${amount.toFixed(2)}` : `-$${Math.abs(amount).toFixed(2)}`;
  
  return `Categorize this transaction:
- Payee: ${payee}
- Description: ${description}
- Amount: ${amountStr}
- Type: ${type}
- Date: ${date}

Based on the payee name, transaction type, and amount, what is the most appropriate budget category?`;
}

/**
 * Categorize a transaction using LLM
 */
export async function categorizeWithLLM(
  transaction: ChaseTransaction,
  cleanedPayee: string,
  llmClient: LLMClient
): Promise<CategorySuggestion> {
  try {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildTransactionPrompt(
      cleanedPayee,
      transaction.description,
      transaction.amount,
      transaction.type,
      transaction.postingDate
    );

    const response = await llmClient.complete(userPrompt, systemPrompt);
    const category = normalizeCategory(response.content);

    // Determine confidence based on whether we had to normalize
    const confidence = response.content.trim() === category ? 'high' : 'medium';

    return {
      category,
      confidence,
      reasoning: `LLM suggested: ${response.content}`,
    };
  } catch (error) {
    // Fallback to Uncategorized on error
    return {
      category: 'Uncategorized',
      confidence: 'low',
      reasoning: `LLM error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
