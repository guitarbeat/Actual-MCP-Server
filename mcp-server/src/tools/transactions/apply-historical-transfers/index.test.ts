import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';

const mockApplyHistoricalTransfers = vi.fn();

vi.mock('../../../core/api/actual-client.js', () => ({
  applyHistoricalTransfers: (...args: unknown[]) => mockApplyHistoricalTransfers(...args),
}));

function parsePayload(result: Awaited<ReturnType<typeof handler>>) {
  const firstContent = result.content[0];

  if (firstContent.type !== 'text') {
    throw new Error('Expected text content');
  }

  return JSON.parse(firstContent.text);
}

describe('apply-historical-transfers handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApplyHistoricalTransfers.mockResolvedValue({
      requestedCandidateCount: 1,
      appliedCount: 1,
      rejectedCount: 0,
      results: [
        {
          candidateId: 'tx-1::tx-2',
          transactionIds: ['tx-1', 'tx-2'],
          status: 'applied',
          categoriesCleared: true,
        },
      ],
    });
  });

  it('passes candidate IDs through and returns the apply payload', async () => {
    const result = await handler({ candidateIds: ['tx-1::tx-2'] });
    const payload = parsePayload(result);

    expect(mockApplyHistoricalTransfers).toHaveBeenCalledWith(['tx-1::tx-2']);
    expect(payload.appliedCount).toBe(1);
  });
});
