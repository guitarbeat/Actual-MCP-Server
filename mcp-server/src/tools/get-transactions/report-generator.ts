// Generates the response/report for get-transactions tool
import { formatAmount } from '../../core/formatting/index.js';

interface TransactionRow {
  id: string;
  date: string;
  payee: string;
  category: string;
  amount: string;
  notes: string;
}

interface ReportMetadata {
  accountReference: string;
  resolvedAccountId: string;
  dateRange: { start: string; end: string };
  appliedFilters: string[];
  filteredCount: number;
  totalFetched: number;
  accountSummary?: { accountName: string; count: number }[];
  totalAmount?: number;
}

export class GetTransactionsReportGenerator {
  generate(mappedTransactions: TransactionRow[], metadata: ReportMetadata): string {
    const header =
      '| ID | Date | Payee | Category | Amount | Notes |\n| ---- | ----- | -------- | ------ | ----- | ----- |\n';
    const rows = mappedTransactions
      .map((t) => `| ${t.id} | ${t.date} | ${t.payee} | ${t.category} | ${t.amount} | ${t.notes} |`)
      .join('\n');

    const filters = metadata.appliedFilters.length > 0 ? metadata.appliedFilters : ['None'];
    const filtersList = filters.map((filter) => `- ${filter}`).join('\n');

    // Build the report sections
    const sections = [
      '# Filtered Transactions',
      '',
      `**Account reference provided:** ${metadata.accountReference}`,
      `**Resolved account ID:** ${metadata.resolvedAccountId}`,
      `**Date range evaluated:** ${metadata.dateRange.start} → ${metadata.dateRange.end}`,
      `**Transactions returned:** ${metadata.filteredCount} of ${metadata.totalFetched} fetched`,
    ];

    if (metadata.totalAmount !== undefined) {
      sections.push(`**Total amount:** ${formatAmount(metadata.totalAmount)}`);
    }

    sections.push('', '**Applied filters:**', filtersList, '');

    // Add account summary if searching across all accounts
    if (metadata.accountSummary && metadata.accountSummary.length > 0) {
      sections.push('**Transactions by account:**');
      metadata.accountSummary.forEach(({ accountName, count }) => {
        sections.push(`- ${accountName}: ${count} transaction${count !== 1 ? 's' : ''}`);
      });
      sections.push('');
    }

    // Add prominent empty state message if no transactions found
    if (mappedTransactions.length === 0) {
      sections.push('## ⚠️ No transactions found matching your filters', '');
      sections.push('No transactions were found that match the specified filters. Try:', '');
      sections.push(
        '- Adjusting the date range',
        '- Removing or relaxing amount filters',
        '- Checking different category or payee filters',
        '',
      );
    }

    // Add table (with empty row if no transactions)
    const table =
      rows.length > 0
        ? `${header}${rows}`
        : `${header}| _No matching transactions_ | — | — | — | — | — |`;
    sections.push(table);

    return sections.join('\n');
  }
}
