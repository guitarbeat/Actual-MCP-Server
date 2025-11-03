// Generates formatted output for create-transaction tool

import { formatAmount } from '../../utils.js';
import type { CreateTransactionInput, EntityCreationResult } from './types.js';

export class CreateTransactionReportGenerator {
  generate(input: CreateTransactionInput, result: EntityCreationResult): string {
    const { accountId, date, amount, payee, category, categoryGroup, notes, cleared } = input;
    const { createdPayee, createdCategory, transactionIds, wasAdded, wasUpdated, errors } = result;

    let report = `# Transaction ${wasUpdated ? 'Updated' : 'Created'} Successfully\n\n`;

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

    report += `- **Status**: ${cleared ? 'Cleared' : 'Pending'}\n`;

    // Show transaction IDs if available
    if (transactionIds.length > 0) {
      report += `- **Transaction ID${transactionIds.length > 1 ? 's' : ''}**: ${transactionIds.join(', ')}\n`;
    }

    report += `\n`;

    // Import result status
    report += `## Import Result\n\n`;
    if (wasAdded) {
      report += `- ✓ Transaction was **added** to the budget\n`;
    }
    if (wasUpdated) {
      report += `- ✓ Transaction was **updated** (matched existing transaction)\n`;
    }
    if (errors && errors.length > 0) {
      report += `\n⚠️ **Warnings/Errors**:\n`;
      errors.forEach((error) => {
        report += `  - ${error}\n`;
      });
      report += `\n`;
    }

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

    if (wasUpdated) {
      report += `\n> ℹ️ **Note**: This transaction matched an existing transaction and was updated instead of creating a duplicate. This is thanks to automatic duplicate detection.`;
    } else {
      report += `\n> ℹ️ **Note**: Transaction rules were automatically executed, and any applicable rules have been applied to this transaction.`;
    }

    return report;
  }
}
