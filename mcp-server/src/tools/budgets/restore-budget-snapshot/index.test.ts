import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';

const mockFsExistsSync = vi.hoisted(() => vi.fn<(p: string) => boolean>());
const mockFsReaddirSync = vi.hoisted(() =>
  vi.fn<
    (p: string, opts?: unknown) => Array<{ name: string; isDirectory: () => boolean }> | string[]
  >(),
);
const mockFsCpSync = vi.hoisted(() => vi.fn());
const mockInitActualApi = vi.hoisted(() => vi.fn());

vi.mock('node:fs', () => ({
  default: {
    existsSync: mockFsExistsSync,
    readdirSync: mockFsReaddirSync,
    cpSync: mockFsCpSync,
  },
  existsSync: mockFsExistsSync,
  readdirSync: mockFsReaddirSync,
  cpSync: mockFsCpSync,
}));

vi.mock('../create-budget-snapshot/index.js', () => ({
  getDataDir: () => '/mock/data',
}));

vi.mock('../../../core/api/actual-client.js', () => ({
  initActualApi: mockInitActualApi,
}));

vi.mock('../list-budget-snapshots/index.js', () => ({
  parseSnapshotDir: (
    dirName: string,
    snapshotsDir: string,
  ): { snapshotId: string; snapshotName: string; createdAt: string; path: string } | undefined => {
    const dashIndex = dirName.indexOf('-');
    if (dashIndex === -1) return undefined;
    const idPart = dirName.slice(0, dashIndex);
    const namePart = dirName.slice(dashIndex + 1);
    const timestamp = Number(idPart);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return undefined;
    return {
      snapshotId: idPart,
      snapshotName: namePart,
      createdAt: new Date(timestamp).toISOString(),
      path: `${snapshotsDir}/${dirName}`,
    };
  },
}));

function parseJsonResponse(response: unknown): Record<string, unknown> {
  const res = response as { content: Array<Record<string, unknown>> };
  const firstContent = res.content[0];
  if (!('text' in firstContent)) {
    throw new Error('Expected text content');
  }
  return JSON.parse(firstContent.text as string) as Record<string, unknown>;
}

describe('restore-budget-snapshot tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitActualApi.mockResolvedValue(undefined);
  });

  describe('handler', () => {
    it('should return error when snapshotId is missing', async () => {
      const response = await handler({});
      expect(response.isError).toBe(true);

      const payload = parseJsonResponse(response);
      expect(String(payload.message)).toContain('snapshotId is required');
    });

    it('should return error when snapshotId is not a string', async () => {
      const response = await handler({ snapshotId: 123 });
      expect(response.isError).toBe(true);
    });

    it('should return error when snapshots directory does not exist', async () => {
      mockFsExistsSync.mockReturnValue(false);

      const response = await handler({ snapshotId: '1700000000000' });
      expect(response.isError).toBe(true);

      const payload = parseJsonResponse(response);
      expect(String(payload.message)).toContain('No snapshots directory');
    });

    it('should return error when snapshot ID is not found', async () => {
      mockFsExistsSync.mockImplementation(
        (p: string) => p.includes('snapshots') && !p.includes('1700000000000'),
      );
      mockFsReaddirSync.mockReturnValue([{ name: '1699999999999-other', isDirectory: () => true }]);

      const response = await handler({ snapshotId: '1700000000000' });
      expect(response.isError).toBe(true);

      const payload = parseJsonResponse(response);
      expect(String(payload.message)).toContain('not found');
    });

    it('should restore snapshot files to data directory', async () => {
      // snapshots dir exists, snapshot dir exists
      mockFsExistsSync.mockReturnValue(true);
      mockFsReaddirSync.mockImplementation((p: string, _opts?: unknown) => {
        if (typeof p === 'string' && p.endsWith('snapshots')) {
          return [{ name: '1700000000000-before_import', isDirectory: () => true }];
        }
        // snapshot dir contents
        return ['db.sqlite', 'metadata.json'];
      });

      const response = await handler({ snapshotId: '1700000000000' });
      expect(response.isError).toBeUndefined();

      const payload = parseJsonResponse(response);
      expect(payload.restored).toBe(true);
      expect(payload.snapshotId).toBe('1700000000000');
      expect(typeof payload.restoredAt).toBe('string');
      expect(typeof payload.reconnectedAt).toBe('string');

      // Should have copied files back
      expect(mockFsCpSync).toHaveBeenCalledTimes(2);
      // Should have re-initialized the API session
      expect(mockInitActualApi).toHaveBeenCalledWith(true);
    });

    it('should skip snapshots subdir when restoring', async () => {
      mockFsExistsSync.mockReturnValue(true);
      mockFsReaddirSync.mockImplementation((p: string, _opts?: unknown) => {
        if (typeof p === 'string' && p.endsWith('snapshots')) {
          return [{ name: '1700000000000-snap', isDirectory: () => true }];
        }
        return ['db.sqlite', 'snapshots'];
      });

      await handler({ snapshotId: '1700000000000' });

      const calls = mockFsCpSync.mock.calls as Array<[string, string, unknown]>;
      const copiedNames = calls.map(([src]) => src.split('/').at(-1));
      expect(copiedNames).not.toContain('snapshots');
      expect(copiedNames).toContain('db.sqlite');
    });

    it('should return error when fs.cpSync throws', async () => {
      mockFsExistsSync.mockReturnValue(true);
      mockFsReaddirSync.mockImplementation((p: string, _opts?: unknown) => {
        if (typeof p === 'string' && p.endsWith('snapshots')) {
          return [{ name: '1700000000000-snap', isDirectory: () => true }];
        }
        return ['db.sqlite'];
      });
      mockFsCpSync.mockImplementation(() => {
        throw new Error('Copy failed');
      });

      const response = await handler({ snapshotId: '1700000000000' });
      expect(response.isError).toBe(true);
    });
  });
});
