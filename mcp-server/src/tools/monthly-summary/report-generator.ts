import { formatAmount } from '../../core/formatting/index.js';
import type { MonthData, MonthlySummaryReportData } from '../../core/types/index.js';

export function generateMonthlySummaryReport(
  data: MonthlySummaryReportData,
  warnings: string[] = [],
): string {
  const {
    start,
    end,
    accountId,
    accountName,
    sortedMonths,
    avgIncome,
    avgExpenses,
    avgInvestments,
    avgTraditionalSavings,
    avgTotalSavings,
    avgTraditionalSavingsRate,
    avgTotalSavingsRate,
  } = data;

  let markdown = `# Monthly Financial Summary\n\n`;

  if (warnings.length > 0) {
    markdown += '## Warnings\n\n';
    warnings.forEach((warning) => {
      markdown += `- ${warning}\n`;
    });
    markdown += '\n';
  }

  markdown += `Period: ${start} to ${end}\n\n`;

  if (accountId) {
    markdown += `Account: ${accountName || accountId}\n\n`;
  } else {
    markdown += `Accounts: All on-budget accounts\n\n`;
  }

  markdown += `## Monthly Breakdown\n\n`;
  markdown += `| Month | Income | Regular Expenses | Investments | Traditional Savings | Total Savings | Total Savings Rate |\n`;
  markdown += `| ----- | ------ | ---------------- | ----------- | ------------------- | ------------- | ------------------ |\n`;

  sortedMonths.forEach((month: MonthData) => {
    const monthName = new Date(month.year, month.month - 1, 1).toLocaleString('default', {
      month: 'long',
    });
    const income = formatAmount(month.income);
    const expenses = formatAmount(month.expenses);
    const investments = formatAmount(month.investments);

    const traditionalSavings = month.income - month.expenses - month.investments;
    const totalSavings = traditionalSavings + month.investments;

    const savingsFormatted = formatAmount(traditionalSavings);
    const totalSavingsFormatted = formatAmount(totalSavings);

    const savingsRate =
      month.income > 0 ? `${((totalSavings / month.income) * 100).toFixed(1)}%` : 'N/A';

    markdown += `| ${monthName} ${month.year} | ${income} | ${expenses} | ${investments} | ${savingsFormatted} | ${totalSavingsFormatted} | ${savingsRate} |\n`;
  });

  markdown += `\n## Averages\n\n`;
  markdown += `Average Monthly Income: ${formatAmount(avgIncome)}\n`;
  markdown += `Average Monthly Regular Expenses: ${formatAmount(avgExpenses)}\n`;
  markdown += `Average Monthly Investments: ${formatAmount(avgInvestments)}\n`;
  markdown += `Average Monthly Traditional Savings: ${formatAmount(avgTraditionalSavings)}\n`;
  markdown += `Average Monthly Total Savings: ${formatAmount(avgTotalSavings)}\n`;
  markdown += `Average Traditional Savings Rate: ${avgTraditionalSavingsRate.toFixed(1)}%\n`;
  markdown += `Average Total Savings Rate: ${avgTotalSavingsRate.toFixed(1)}%\n`;

  markdown += `\n## Definitions\n\n`;
  markdown += `* **Traditional Savings**: Income minus regular expenses and investments\n`;
  markdown += `* **Total Savings**: Traditional savings plus investments\n`;

  return markdown;
}
