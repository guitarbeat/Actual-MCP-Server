import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatStartupReadinessLogLine } from './startup-readiness-log.js';

const { mockGetReadinessSnapshot } = vi.hoisted(() => ({
  mockGetReadinessSnapshot: vi.fn(),
}));

vi.mock('../core/api/actual-client.js', () => ({
  getReadinessSnapshot: mockGetReadinessSnapshot,
}));

describe('formatStartupReadinessLogLine', () => {
  beforeEach(() => {
    mockGetReadinessSnapshot.mockReset();
  });

  it('formats the Render-friendly [STARTUP] line without redundant keys', () => {
    mockGetReadinessSnapshot.mockReturnValue({
      ready: true,
      status: 'ready',
      reason: 'ready',
      lastReadyAt: '2026-01-01T00:00:00.000Z',
      lastSyncAt: '2026-01-01T00:00:00.000Z',
      lastError: null,
      debugError: null,
      activeBudgetId: 'b1',
    });

    expect(formatStartupReadinessLogLine()).toBe(
      '[STARTUP] actual_api status=ready readiness=true reason=ready lastError=none',
    );
  });

  it('prints lastError when present', () => {
    mockGetReadinessSnapshot.mockReturnValue({
      ready: false,
      status: 'error',
      reason: 'connection_failed',
      lastReadyAt: null,
      lastSyncAt: null,
      lastError: 'connection_failed',
      debugError: null,
      activeBudgetId: null,
    });

    expect(formatStartupReadinessLogLine()).toBe(
      '[STARTUP] actual_api status=error readiness=false reason=connection_failed lastError=connection_failed',
    );
  });
});
