import { format, getMonth, getYear, parse } from 'date-fns';
import type { MonthData, Transaction } from '../../core/types/index.js';

export class MonthlySummaryTransactionAggregator {
  aggregate(
    transactions: Transaction[],
    incomeCategories: Set<string>,
    investmentSavingsCategories: Set<string>,
  ): MonthData[] {
    const monthlyData: Record<string, MonthData> = {};

    transactions.forEach((transaction) => {
      if (transaction.transfer_id && !transaction.category) {
        // # Reason: Transfers move funds between internal accounts and should not affect income, expenses, or counts.
        // If the transfer moves between on-budget and off-budget accounts, we may handle it differently later.
        return;
      }

      // Parse date as local date to avoid timezone issues with YYYY-MM-DD format
      const date = parse(transaction.date, 'yyyy-MM-dd', new Date());
      const yearMonth = format(date, 'yyyy-MM');

      if (!monthlyData[yearMonth]) {
        monthlyData[yearMonth] = {
          year: getYear(date),
          month: getMonth(date) + 1, // getMonth returns 0-11, we need 1-12
          income: 0,
          expenses: 0,
          investments: 0,
          transactions: 0,
        };
      }

      const isIncome = transaction.category ? incomeCategories.has(transaction.category) : false;
      const isInvestmentOrSavings = transaction.category
        ? investmentSavingsCategories.has(transaction.category)
        : false;

      if (isIncome || transaction.amount > 0) {
        monthlyData[yearMonth].income += Math.abs(transaction.amount);
      } else if (isInvestmentOrSavings) {
        monthlyData[yearMonth].investments += Math.abs(transaction.amount);
      } else {
        monthlyData[yearMonth].expenses += Math.abs(transaction.amount);
      }

      monthlyData[yearMonth].transactions += 1;
    });

    return Object.values(monthlyData).sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month,
    );
  }
}
