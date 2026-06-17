// Shared category classification logic
import type { Category } from '../types/domain.js';

export class CategoryClassifier {
  classify(categories: Category[]): {
    incomeCategories: Set<string>;
    investmentSavingsCategories: Set<string>;
  } {
    const incomeCategories = new Set<string>();
    const investmentSavingsCategories = new Set<string>();

    categories.forEach((cat) => {
      if (cat.is_income) incomeCategories.add(cat.id);
      if (
        cat.name.toLowerCase().includes('investment') ||
        cat.name.toLowerCase().includes('vacation') ||
        cat.name.toLowerCase().includes('savings')
      ) {
        investmentSavingsCategories.add(cat.id);
      }
    });

    return { incomeCategories, investmentSavingsCategories };
  }

  /**
   * Predict a category for a transaction based on basic payee name and amount patterns
   * Useful when standard rules haven't caught it yet
   */
  classifyTransaction(
    transaction: { payee_name?: string | null; amount: number },
    categories: Category[]
  ): string | null {
    const payeeLower = (transaction.payee_name || '').toLowerCase();

    // Simple heuristic map (payee keyword -> category keyword)
    const heuristics: Record<string, string> = {
      'amazon': 'shopping',
      'walmart': 'groceries',
      'target': 'shopping',
      'whole foods': 'groceries',
      'uber': 'transportation',
      'lyft': 'transportation',
      'netflix': 'subscriptions',
      'spotify': 'subscriptions',
      'mcdonalds': 'restaurants',
      'starbucks': 'restaurants',
      'shell': 'gas',
      'chevron': 'gas',
      'home depot': 'home',
      'lowes': 'home',
      'cvs': 'medical',
      'walgreens': 'medical'
    };

    // Income heuristics (amount > 0)
    if (transaction.amount > 0) {
      if (payeeLower.includes('payroll') || payeeLower.includes('salary') || payeeLower.includes('employer')) {
        const incomeCat = categories.find(c => c.is_income || c.name.toLowerCase().includes('income'));
        if (incomeCat) return incomeCat.id;
      }
      if (payeeLower.includes('interest') || payeeLower.includes('dividend')) {
        const interestCat = categories.find(c => c.name.toLowerCase().includes('interest') || c.name.toLowerCase().includes('dividend'));
        if (interestCat) return interestCat.id;
      }
    } else {
      // Expense heuristics
      for (const [payeeKeyword, categoryKeyword] of Object.entries(heuristics)) {
        if (payeeLower.includes(payeeKeyword)) {
          const matchedCategory = categories.find(c => c.name.toLowerCase().includes(categoryKeyword));
          if (matchedCategory) return matchedCategory.id;
        }
      }

      // Amount-based heuristics
      // e.g., large even numbers might be rent/mortgage
      if (transaction.amount <= -100000 && transaction.amount % 10000 === 0) { // -$1000+ and even hundred
        const housingCat = categories.find(c => c.name.toLowerCase().includes('rent') || c.name.toLowerCase().includes('mortgage'));
        if (housingCat) return housingCat.id;
      }
    }

    return null;
  }
}
