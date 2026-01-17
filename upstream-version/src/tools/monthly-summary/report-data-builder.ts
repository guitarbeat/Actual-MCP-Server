import type { Account, MonthData, MonthlySummaryReportData } from '../../core/types/index.js';

interface BuildOptions {
  start: string;
  end: string;
  accountId: string | undefined;
  accounts: Account[];
  sortedMonths: MonthData[];
  averages: {
    avgIncome: number;
    avgExpenses: number;
    avgInvestments: number;
    avgTraditionalSavings: number;
    avgTotalSavings: number;
    avgTraditionalSavingsRate: number;
    avgTotalSavingsRate: number;
  };
}

export class MonthlySummaryReportDataBuilder {
  build(options: BuildOptions): MonthlySummaryReportData {
    const { start, end, accountId, accounts, sortedMonths, averages } = options;
    const accountName = accountId ? accounts.find((a) => a.id === accountId)?.name : undefined;

    return {
      start,
      end,
      accountId,
      accountName,
      sortedMonths,
      ...averages,
    };
  }
}
