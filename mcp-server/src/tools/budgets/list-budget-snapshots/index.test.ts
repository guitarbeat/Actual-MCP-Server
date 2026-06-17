import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler, parseSnapshotDir } from './index.js';

const mockFsExistsSync = vi.hoisted(() => vi.fn<(p: string) => boolean>());
const mockFsReaddirSync = vi.hoisted(() =>
  vi.fn<() => Array<{ name: string; isDirectory: () => boolean }>>(),
);

vi.mock('node:fs', () => ({
  default: {
    existsSync: mockFsExistsSync,
    readdirSync: mockFsReaddirSync,
  },
  existsSync: mockFsExistsSync,
  readdirSync: mockFsReaddirSync,
}));

// getDataDir is used from create-budget-snapshot, mock it
vi.mock('../create-budget-snapshot/index.js', () => ({
  getDataDir: () => '/mock/data',
}));

function parseJsonResponse(response: unknown): Record<string, unknown> {
  const res = response as { content: Array<Record<string, unknown>> };
  const firstContent = res.content[0];
  if (!('text' in firstContent)) {
    throw new Error('Expected text content');
  }
  return JSON.parse(firstContent.text as string) as Record<string, unknown>;
}

describe('list-budget-snapshots tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseSnapshotDir', () => {
    it('parses a valid snapshot directory name', () => {
      const result = parseSnapshotDir('1700000000000-before_import', '/snapshots');
      expect(result).toBeDefined();
      expect(result?.snapshotId).toBe('1700000000000');
      expect(result?.snapshotName).toBe('before import');
      expect(result?.createdAt).toBe(new Date(1700000000000).toISOString());
    });

    it('returns undefined when there is no dash', () => {
      expect(parseSnapshotDir('notasnapshotdir', '/snapshots')).toBeUndefined();
    });

    it('returns undefined when timestamp part is not numeric', () => {
      expect(parseSnapshotDir('abc-name', '/snapshots')).toBeUndefined();
    });

    it('returns undefined when timestamp is zero', () => {
      expect(parseSnapshotDir('0-name', '/snapshots')).toBeUndefined();
    });
  });

  describe('handler', () => {
    it('should return empty array when snapshots dir does not exist', async () => {
      mockFsExistsSync.mockReturnValue(false);

      const response = await handler({});
      expect(response.isError).toBeUndefined();

      const payload = parseJsonResponse(response);
      expect(payload.snapshots).toEqual([]);
    });

    it('should list and sort snapshots by creation time desc', async () => {
      mockFsExistsSync.mockReturnValue(true);
      mockFsReaddirSync.mockReturnValue([
        { name: '1700000000000-snapshot', isDirectory: () => true },
        { name: '1700000001000-later', isDirectory: () => true },
        { name: 'notadirectory.txt', isDirectory: () => false },
      ]);

      const response = await handler({});
      expect(response.isError).toBeUndefined();

      const payload = parseJsonResponse(response);
      const snapshots = payload.snapshots as Array<{ snapshotId: string }>;
      expect(snapshots).toHaveLength(2);
      // Most recent first
      expect(snapshots[0].snapshotId).toBe('1700000001000');
      expect(snapshots[1].snapshotId).toBe('1700000000000');
    });

    it('should skip non-directory entries', async () => {
      mockFsExistsSync.mockReturnValue(true);
      mockFsReaddirSync.mockReturnValue([{ name: 'somefile.txt', isDirectory: () => false }]);

      const response = await handler({});
      const payload = parseJsonResponse(response);
      expect((payload.snapshots as unknown[]).length).toBe(0);
    });

    it('should return error when readdirSync throws', async () => {
      mockFsExistsSync.mockReturnValue(true);
      mockFsReaddirSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      const response = await handler({});
      expect(response.isError).toBe(true);
    });
  });
});
