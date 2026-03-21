// Generates the markdown report for balance-history tool

import { formatAmount } from '../../core/formatting/index.js';
import type { Account } from '../../core/types/index.js';
import type { MonthBalance } from './balance-calculator.js';

export class BalanceHistoryReportGenerator {
  generate(
    account: Account | undefined,
    period: { start: string; end: string },
    sortedMonths: MonthBalance[],
    warnings: string[] = [],
  ): string {
    let markdown = `# Balance History\n\n`;
    if (warnings.length > 0) {
      markdown += '## Warnings\n\n';
      warnings.forEach((warning) => {
        markdown += `- ${warning}\n`;
      });
      markdown += '\n';
    }
    if (account) {
      markdown += `Account: ${account.name}\n`;
    }
    markdown += `Period: ${period.start} to ${period.end}\n\n`;

    // Add balance history table
    if (account) {
      markdown += `| Month | End of Month Balance | Monthly Change | Transactions |\n`;
      markdown += `| ----- | -------------------- | -------------- | ------------ |\n`;
    } else {
      markdown += `| Month | Account | End of Month Balance | Monthly Change | Transactions |\n`;
      markdown += `| ----- | ------- | -------------------- | -------------- | ------------ |\n`;
    }

    sortedMonths.forEach((month) => {
      const monthName: string = new Date(month.year, month.month - 1, 1).toLocaleString('default', {
        month: 'long',
      });
      const monthLabel = `${monthName} ${month.year}`;
      const balance: string = formatAmount(month.balance);

      let changeDisplay: string;
      if (month.change === undefined) {
        changeDisplay = 'N/A';
      } else {
        const direction = month.change > 0 ? '↑ ' : month.change < 0 ? '↓ ' : '';
        changeDisplay = `${direction}${formatAmount(month.change)}`;
      }

      if (account) {
        markdown += `| ${monthLabel} | ${balance} | ${changeDisplay} | ${month.transactions} |\n`;
      } else {
        const accountName = month.account ?? 'Unknown account';
        markdown += `| ${monthLabel} | ${accountName} | ${balance} | ${changeDisplay} | ${month.transactions} |\n`;
      }
    });

    return markdown;
  }
}
