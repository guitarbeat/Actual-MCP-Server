export const HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR = '::';

interface TransferLikePattern {
  key:
    | 'bill-payment'
    | 'payment'
    | 'transfer'
    | 'venmo'
    | 'zelle'
    | 'cash-app'
    | 'paypal'
    | 'apple-cash'
    | 'electronic-payment';
  pattern: RegExp;
  reason: string;
}

const TRANSFER_LIKE_PATTERNS: TransferLikePattern[] = [
  {
    key: 'bill-payment',
    pattern: /\bbill payment\b/i,
    reason:
      'Bill-payment labels often represent card payments or account transfers, but no strict unique inverse match was found.',
  },
  {
    key: 'payment',
    pattern: /\bpayment\b/i,
    reason:
      'Payment labels often represent transfers or card payments, but no strict unique inverse match was found.',
  },
  {
    key: 'transfer',
    pattern: /\btransfer\b/i,
    reason:
      'Transfer wording suggests an account move, but no strict unique inverse match was found.',
  },
  {
    key: 'venmo',
    pattern: /\bvenmo\b/i,
    reason:
      'Venmo activity often mixes spending with peer transfers, so this cluster still needs manual review.',
  },
  {
    key: 'zelle',
    pattern: /\bzelle\b/i,
    reason:
      'Zelle activity often mixes spending with peer transfers, so this cluster still needs manual review.',
  },
  {
    key: 'cash-app',
    pattern: /cash app/i,
    reason:
      'Cash App activity often mixes spending with peer transfers, so this cluster still needs manual review.',
  },
  {
    key: 'paypal',
    pattern: /paypal/i,
    reason:
      'PayPal activity often mixes purchases with transfers, so this cluster still needs manual review.',
  },
  {
    key: 'apple-cash',
    pattern: /apple cash/i,
    reason:
      'Apple Cash activity often represents transfers between accounts or people, so this cluster still needs manual review.',
  },
  {
    key: 'electronic-payment',
    pattern: /electronic payment/i,
    reason:
      'Electronic-payment wording suggests a transfer or bill-payment flow, but no strict unique inverse match was found.',
  },
];

export interface TransferLikeMatch {
  key: TransferLikePattern['key'];
  reason: string;
}

export function buildHistoricalTransferCandidateId(
  firstTransactionId: string,
  secondTransactionId: string,
): string {
  return [firstTransactionId, secondTransactionId]
    .sort((left, right) => left.localeCompare(right))
    .join(HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR);
}

export function parseHistoricalTransferCandidateId(candidateId: string): [string, string] {
  const parts = candidateId
    .split(HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length !== 2) {
    throw new Error(
      `Invalid historical transfer candidate ID "${candidateId}". Expected two transaction IDs joined by "${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}".`,
    );
  }

  return [parts[0], parts[1]];
}

export function shiftDateByDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date "${dateString}" supplied for historical transfer matching.`);
  }

  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getDateDiffInDays(firstDate: string, secondDate: string): number {
  const first = new Date(`${firstDate}T00:00:00.000Z`);
  const second = new Date(`${secondDate}T00:00:00.000Z`);

  if (Number.isNaN(first.getTime()) || Number.isNaN(second.getTime())) {
    throw new Error(
      `Invalid dates "${firstDate}" and "${secondDate}" supplied for historical transfer matching.`,
    );
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.abs(Math.round((second.getTime() - first.getTime()) / millisecondsPerDay));
}

export function getTransferLikeMatch(label: string): TransferLikeMatch | null {
  const trimmed = label.trim();

  if (!trimmed) {
    return null;
  }

  const matchedPattern = TRANSFER_LIKE_PATTERNS.find(({ pattern }) => pattern.test(trimmed));

  if (!matchedPattern) {
    return null;
  }

  return {
    key: matchedPattern.key,
    reason: matchedPattern.reason,
  };
}
