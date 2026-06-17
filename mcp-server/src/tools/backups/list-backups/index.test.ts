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

describe('list-backups tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has correct name and description', () => {
    expect(schema.name).toBe('list-backups');
    expect(schema.description).toBeDefined();
  });

  it('fails if no active budget is loaded', async () => {
    const { getConnectionState } = await import('../../../core/api/actual-client.js');
    vi.mocked(getConnectionState).mockReturnValueOnce({ activeBudgetId: null } as any);

    const response = await handler({});
    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain('No active budget loaded');
  });

  it('successfully retrieves and returns backups', async () => {
    const actualApi = (await import('@actual-app/api')).default;

    const mockBackups = [
      { id: 'backup-1.sqlite', date: '2023-01-01T12:00:00.000Z' },
      { id: 'backup-2.sqlite', date: '2023-01-02T12:00:00.000Z' },
    ];

    vi.mocked(actualApi.internal!.send).mockResolvedValue(mockBackups);

    const result = await handler({});

    expect(actualApi.internal!.send).toHaveBeenCalledWith('backups-get', { id: 'test-budget-id' });

    expect(result.isError).toBe(undefined);
    expect(result.content[0].text).toContain('backup-1.sqlite');
    expect(result.content[0].text).toContain('backup-2.sqlite');
    expect(result.content[0].text).toContain('Size: 0 bytes'); // mocked size
  });
});
