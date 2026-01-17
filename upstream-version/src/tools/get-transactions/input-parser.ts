// Parses and validates input arguments for get-transactions tool

import type { GetTransactionsArgs } from '../../core/types/index.js';

export class GetTransactionsInputParser {
  parse(args: unknown): GetTransactionsArgs {
    if (!args || typeof args !== 'object') {
      throw new Error(
        "Invalid arguments: 'args' must be an object. Please check the tool schema for the correct input format."
      );
    }
    const argsObj = args as Record<string, unknown>;
    const { accountId, startDate, endDate, minAmount, maxAmount, categoryName, payeeName, limit, excludeTransfers } =
      argsObj;

    if (!accountId || typeof accountId !== 'string') {
      throw new Error(
        "Missing or invalid 'accountId'. Please provide an account name (e.g., 'Checking', 'Savings') or 'all' to search across all accounts."
      );
    }

    if (startDate !== undefined && typeof startDate !== 'string') {
      throw new Error("Invalid 'startDate': Must be a string in YYYY-MM-DD format.");
    }

    if (endDate !== undefined && typeof endDate !== 'string') {
      throw new Error("Invalid 'endDate': Must be a string in YYYY-MM-DD format.");
    }

    if (limit !== undefined && (typeof limit !== 'number' || limit < 1)) {
      throw new Error("Invalid 'limit': Must be a positive number.");
    }

    return {
      accountId,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      minAmount: typeof minAmount === 'number' ? minAmount : undefined,
      maxAmount: typeof maxAmount === 'number' ? maxAmount : undefined,
      categoryName: typeof categoryName === 'string' ? categoryName : undefined,
      payeeName: typeof payeeName === 'string' ? payeeName : undefined,
      limit: typeof limit === 'number' ? limit : undefined,
      excludeTransfers: typeof excludeTransfers === 'boolean' ? excludeTransfers : undefined,
    };
  }
}
