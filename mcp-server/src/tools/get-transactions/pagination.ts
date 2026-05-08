/** Default page size when `limit` is omitted (overridable via env). */
export const GET_TRANSACTIONS_FALLBACK_DEFAULT_LIMIT = 200;

/** Hard cap per request for agent context and server memory. */
export const GET_TRANSACTIONS_ABSOLUTE_MAX_LIMIT = 5000;

export function readGetTransactionsDefaultLimit(): number {
  const raw = Number.parseInt(process.env.ACTUAL_GET_TRANSACTIONS_DEFAULT_LIMIT ?? '', 10);
  if (!Number.isFinite(raw) || raw < 1) {
    return GET_TRANSACTIONS_FALLBACK_DEFAULT_LIMIT;
  }
  return Math.min(raw, GET_TRANSACTIONS_ABSOLUTE_MAX_LIMIT);
}

export function readGetTransactionsMaxLimit(): number {
  const raw = Number.parseInt(process.env.ACTUAL_GET_TRANSACTIONS_MAX_LIMIT ?? '', 10);
  if (!Number.isFinite(raw) || raw < 1) {
    return GET_TRANSACTIONS_ABSOLUTE_MAX_LIMIT;
  }
  return Math.min(raw, GET_TRANSACTIONS_ABSOLUTE_MAX_LIMIT);
}

export interface ResolvedGetTransactionsPagination {
  offset: number;
  limit: number;
  cappedToMax: boolean;
  defaultedLimit: boolean;
}

export function resolveGetTransactionsPagination(input: {
  limit?: number;
  offset?: number;
}): ResolvedGetTransactionsPagination {
  const maxCap = readGetTransactionsMaxLimit();
  const fallbackDefault = readGetTransactionsDefaultLimit();

  const rawLimit =
    typeof input.limit === 'number' && Number.isFinite(input.limit) ? input.limit : fallbackDefault;

  let limit = Math.floor(rawLimit);
  let cappedToMax = false;
  if (limit > maxCap) {
    limit = maxCap;
    cappedToMax = true;
  }
  limit = Math.max(1, limit);

  const defaultedLimit = input.limit === undefined;

  let offset =
    typeof input.offset === 'number' && Number.isFinite(input.offset)
      ? Math.floor(input.offset)
      : 0;
  offset = Math.max(0, offset);

  return {
    offset,
    limit,
    cappedToMax,
    defaultedLimit,
  };
}
