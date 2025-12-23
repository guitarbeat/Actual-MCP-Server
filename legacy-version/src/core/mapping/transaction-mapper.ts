// Shared transaction mapping logic
import { formatAmount, formatDate } from '../formatting/index.js';
import type { Transaction } from '../types/domain.js';

export class TransactionMapper {
  map(transactions: Transaction[]): Array<{
    id: string;
    date: string;
    payee: string;
    category: string;
    amount: string;
    notes: string;
  }> {
    return transactions.map((t) => ({
      id: t.id,
      date: formatDate(t.date),
      payee: t.payee_name || t.payee || '(No payee)',
      category: t.category_name || t.category || '(Uncategorized)',
      amount: formatAmount(t.amount),
      notes: t.notes || '',
    }));
  }
}
