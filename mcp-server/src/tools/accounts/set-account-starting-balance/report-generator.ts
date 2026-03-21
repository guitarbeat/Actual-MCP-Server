import { formatAmount } from '../../../core/formatting/index.js';
import type { StartingBalanceResult } from './types.js';

export class SetAccountStartingBalanceReportGenerator {
  generate(result: StartingBalanceResult): object {
    return {
      accountId: result.accountId,
      accountName: result.accountName,
      transactionId: result.transactionId,
      action: result.action,
      effectiveDate: result.effectiveDate,
      amount: formatAmount(result.amountCents),
      duplicateTransactionIds: result.duplicateTransactionIds,
      warnings: result.warnings,
    };
  }
}
