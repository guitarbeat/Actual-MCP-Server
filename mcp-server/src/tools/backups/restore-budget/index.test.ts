import { describe, expect, it, vi, beforeEach } from 'vitest';
import { schema, handler } from './index.js';

vi.mock('../../../core/api/actual-client.js', () => ({
  getConnectionState: vi.fn().mockReturnValue({ activeBudgetId: 'test-budget-id' }),
}));

vi.mock('@actual-app/api', () => {
  return {
    default: {
      internal: {
        send: vi.fn(),
      }
    }
  };
});

describe('restore-budget tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has correct name and description', () => {
    expect(schema.name).toBe('restore-budget');
    expect(schema.description).toBeDefined();
  });

  it('fails if no active budget is loaded', async () => {
    const { getConnectionState } = await import('../../../core/api/actual-client.js');
    vi.mocked(getConnectionState).mockReturnValueOnce({ activeBudgetId: null } as any);

    const response = await handler({ backupId: 'backup-123.sqlite', dryRun: false });
    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain('No active budget loaded');
  });

  it('simulates restoration if dryRun is true', async () => {
    const actualApi = (await import('@actual-app/api')).default;
    vi.mocked(actualApi.internal!.send).mockResolvedValue(undefined);

    const response = await handler({ backupId: 'backup-123.sqlite', dryRun: true });

    expect(actualApi.internal!.send).not.toHaveBeenCalledWith('backup-load', expect.anything());
    expect(response.isError).toBe(undefined);
    expect(response.content[0].text).toContain("Dry run: Ready to restore backup 'backup-123.sqlite'");
  });

  it('actually restores the budget if dryRun is false', async () => {
    const actualApi = (await import('@actual-app/api')).default;
    vi.mocked(actualApi.internal!.send).mockResolvedValue(undefined);

    const response = await handler({ backupId: 'backup-123.sqlite', dryRun: false });

    expect(actualApi.internal!.send).toHaveBeenCalledWith('backup-load', { id: 'test-budget-id', backupId: 'backup-123.sqlite' });
    expect(response.isError).toBe(undefined);
    expect(response.content[0].text).toContain("Successfully restored backup 'backup-123.sqlite'");
  });
});
