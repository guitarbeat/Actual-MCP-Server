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

describe('backup-budget tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has correct name and description', () => {
    expect(schema.name).toBe('backup-budget');
    expect(schema.description).toBeDefined();
  });

  it('fails if no active budget is loaded', async () => {
    const { getConnectionState } = await import('../../../core/api/actual-client.js');
    vi.mocked(getConnectionState).mockReturnValueOnce({ activeBudgetId: null } as any);

    const response = await handler({});
    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain('No active budget loaded');
  });

  it('successfully creates and returns the latest backup', async () => {
    const actualApi = (await import('@actual-app/api')).default;

    const mockBackups = [
      { id: 'backup-1.sqlite', date: '2023-01-01T12:00:00.000Z' },
      { id: 'backup-2.sqlite', date: '2023-01-02T12:00:00.000Z' },
      { id: 'backup-3.sqlite', date: '2023-01-01T15:00:00.000Z' },
    ];

    vi.mocked(actualApi.internal!.send).mockImplementation((command, args) => {
      if (command === 'backup-make') {
        return Promise.resolve();
      }
      if (command === 'backups-get') {
        expect(args).toEqual({ id: 'test-budget-id' });
        return Promise.resolve(mockBackups);
      }
      return Promise.resolve();
    });

    const result = await handler({});

    expect(actualApi.internal!.send).toHaveBeenCalledWith('backup-make', { id: 'test-budget-id' });
    expect(actualApi.internal!.send).toHaveBeenCalledWith('backups-get', { id: 'test-budget-id' });

    expect(result.isError).toBe(undefined);
    expect(result.content[0].text).toContain('Backup created successfully');
    expect(result.content[0].text).toContain('backup-2.sqlite');
  });
});
