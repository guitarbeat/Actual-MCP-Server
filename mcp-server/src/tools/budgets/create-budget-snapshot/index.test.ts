import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler, buildSnapshotId, getDataDir } from './index.js';

// Hoist mocks before imports
const mockFsExistsSync = vi.hoisted(() => vi.fn<(p: string) => boolean>());
const mockFsMkdirSync = vi.hoisted(() => vi.fn());
const mockFsReaddirSync = vi.hoisted(() => vi.fn<() => string[]>());
const mockFsCpSync = vi.hoisted(() => vi.fn());

vi.mock('node:fs', () => ({
  default: {
    existsSync: mockFsExistsSync,
    mkdirSync: mockFsMkdirSync,
    readdirSync: mockFsReaddirSync,
    cpSync: mockFsCpSync,
  },
  existsSync: mockFsExistsSync,
  mkdirSync: mockFsMkdirSync,
  readdirSync: mockFsReaddirSync,
  cpSync: mockFsCpSync,
}));

vi.mock('../../../core/api/actual-client.js', () => ({
  DEFAULT_DATA_DIR: '/mock/.actual',
}));

function parseJsonResponse(response: unknown): Record<string, unknown> {
  const res = response as { content: Array<Record<string, unknown>> };
  const firstContent = res.content[0];
  if (!('text' in firstContent)) {
    throw new Error('Expected text content');
  }
  return JSON.parse(firstContent.text as string) as Record<string, unknown>;
}

describe('create-budget-snapshot tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ACTUAL_DATA_DIR;
    // Default: snapshots dir does not exist, data dir has some files
    mockFsExistsSync.mockReturnValue(false);
    mockFsReaddirSync.mockReturnValue(['db.sqlite', 'metadata.json']);
  });

  describe('getDataDir', () => {
    it('returns ACTUAL_DATA_DIR env var when set', () => {
      process.env.ACTUAL_DATA_DIR = '/custom/path';
      expect(getDataDir()).toBe('/custom/path');
      delete process.env.ACTUAL_DATA_DIR;
    });

    it('returns default data dir when env var is not set', () => {
      delete process.env.ACTUAL_DATA_DIR;
      const dir = getDataDir();
      expect(dir).toContain('.actual');
    });
  });

  describe('buildSnapshotId', () => {
    it('converts timestamp to string', () => {
      expect(buildSnapshotId(1700000000000)).toBe('1700000000000');
    });
  });

  describe('handler', () => {
    it('should create a snapshot with default name when no args provided', async () => {
      const response = await handler({});
      expect(response.isError).toBeUndefined();

      const payload = parseJsonResponse(response);
      expect(typeof payload.snapshotId).toBe('string');
      expect(payload.snapshotName).toBe('snapshot');
      expect(typeof payload.createdAt).toBe('string');
      expect(typeof payload.path).toBe('string');
    });

    it('should create a snapshot with custom name', async () => {
      const response = await handler({ snapshotName: 'before-import' });
      expect(response.isError).toBeUndefined();

      const payload = parseJsonResponse(response);
      expect(payload.snapshotName).toBe('before-import');
      expect(String(payload.path)).toContain('before-import');
    });

    it('should sanitize special characters in snapshot name', async () => {
      const response = await handler({ snapshotName: 'my snapshot!' });
      expect(response.isError).toBeUndefined();

      const payload = parseJsonResponse(response);
      expect(String(payload.path)).not.toContain('!');
      expect(String(payload.path)).toContain('my_snapshot_');
    });

    it('should create snapshots dir if it does not exist', async () => {
      mockFsExistsSync.mockReturnValue(false);

      await handler({});

      expect(mockFsMkdirSync).toHaveBeenCalledWith(expect.stringContaining('snapshots'), {
        recursive: true,
      });
    });

    it('should skip snapshots subdirectory when copying', async () => {
      mockFsReaddirSync.mockReturnValue(['db.sqlite', 'metadata.json', 'snapshots']);

      await handler({});

      // cpSync should be called for db.sqlite and metadata.json but not snapshots
      const calls = mockFsCpSync.mock.calls as Array<[string, string, unknown]>;
      const copiedNames = calls.map(([src]) => src.split('/').at(-1));
      expect(copiedNames).not.toContain('snapshots');
      expect(copiedNames).toContain('db.sqlite');
      expect(copiedNames).toContain('metadata.json');
    });

    it('should return error when fs operations fail', async () => {
      mockFsMkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const response = await handler({});
      expect(response.isError).toBe(true);

      const payload = parseJsonResponse(response);
      expect(payload.error).toBe(true);
      expect(String(payload.message)).toContain('Permission denied');
    });
  });
});
