// Generates formatted output for create-transaction tool

import { formatAmount } from '../../utils.js';
import type { CreateTransactionInput, EntityCreationResult } from './types.js';

export class CreateTransactionReportGenerator {
  generate(input: CreateTransactionInput, result: EntityCreationResult & { transactionId: string }): string {
    const { accountId, date, amount, payee, category, categoryGroup, notes, cleared } = input;
    const { createdPayee, createdCategory } = result;

    let report = `# Transaction Created Successfully\n\n`;

    // Transaction details
    report += `## Transaction Details\n\n`;
    report += `- **Date**: ${date}\n`;
    report += `- **Amount**: ${formatAmount(amount * 100)}\n`;
    report += `- **Account ID**: ${accountId}\n`;

    if (payee) {
      report += `- **Payee**: ${payee}`;
      if (createdPayee) {
        report += ` *(newly created)*`;
      }
      report += `\n`;
    }

    if (category || categoryGroup) {
      const categoryName = category || categoryGroup;
      report += `- **Category**: ${categoryName}`;
      if (createdCategory) {
        report += ` *(newly created)*`;
      }
      report += `\n`;
    }

    if (notes) {
      report += `- **Notes**: ${notes}\n`;
    }

    report += `- **Status**: ${cleared ? 'Cleared' : 'Pending'}\n\n`;

    // Creation summary
    if (createdPayee || createdCategory) {
      report += `## Entities Created\n\n`;

      if (createdPayee && payee) {
        report += `- ✓ Created new payee: **${payee}**\n`;
      }

      if (createdCategory) {
        const entityName = category || categoryGroup;
        if (entityName) {
          report += `- ✓ Created new category: **${entityName}**\n`;
        }
      }

      report += `\n`;
    }

    report += `The transaction has been successfully added to your budget.`;

    return report;
  }
}
