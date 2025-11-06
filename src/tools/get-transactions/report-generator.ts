// Generates the response/report for get-transactions tool

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
}

export class GetTransactionsReportGenerator {
  generate(mappedTransactions: TransactionRow[], metadata: ReportMetadata): string {
    const header =
      '| ID | Date | Payee | Category | Amount | Notes |\n| ---- | ----- | -------- | ------ | ----- | ----- |\n';
    const rows = mappedTransactions
      .map((t) => `| ${t.id} | ${t.date} | ${t.payee} | ${t.category} | ${t.amount} | ${t.notes} |`)
      .join('\n');

    const table = rows.length > 0 ? `${header}${rows}` : `${header}| _No matching transactions_ | — | — | — | — | — |`;

    const filters = metadata.appliedFilters.length > 0 ? metadata.appliedFilters : ['None'];
    const filtersList = filters.map((filter) => `- ${filter}`).join('\n');

    return [
      '# Filtered Transactions',
      '',
      `**Account reference provided:** ${metadata.accountReference}`,
      `**Resolved account ID:** ${metadata.resolvedAccountId}`,
      `**Date range evaluated:** ${metadata.dateRange.start} → ${metadata.dateRange.end}`,
      `**Transactions returned:** ${metadata.filteredCount} of ${metadata.totalFetched} fetched`,
      '',
      '**Applied filters:**',
      filtersList,
      '',
      table,
    ].join('\n');
  }
}
