import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveTimelineReconPaths } from './paths.js';
import {
  LOCATION_HISTORY_FILENAME,
  SUPPLEMENTAL_TRANSACTIONS_FILENAME,
  TIMELINE_CATEGORY_OVERRIDES_FILENAME,
  TIMELINE_PLACE_CACHE_FILENAME,
  TIMELINE_RECON_AUDIT_FILENAME,
  TIMELINE_RECON_CANDIDATES_FILENAME,
  TIMELINE_RECON_MANUAL_REVIEW_FILENAME,
} from './constants.js';

describe('Timeline Recon Paths', () => {
  describe('resolveTimelineReconPaths', () => {
    it('should resolve paths relative to a custom repo root', () => {
      const customRoot = resolve('/test/repo/root');
      const paths = resolveTimelineReconPaths(customRoot);

      const expectedReconDir = resolve(customRoot, '.local-reconciliation/timeline');

      expect(paths).toEqual({
        repoRoot: customRoot,
        reconDir: expectedReconDir,
        supplementalCsvPath: resolve(expectedReconDir, SUPPLEMENTAL_TRANSACTIONS_FILENAME),
        timelinePath: resolve(expectedReconDir, LOCATION_HISTORY_FILENAME),
        auditPath: resolve(expectedReconDir, TIMELINE_RECON_AUDIT_FILENAME),
        candidatesPath: resolve(expectedReconDir, TIMELINE_RECON_CANDIDATES_FILENAME),
        manualReviewPath: resolve(expectedReconDir, TIMELINE_RECON_MANUAL_REVIEW_FILENAME),
        placeCachePath: resolve(expectedReconDir, TIMELINE_PLACE_CACHE_FILENAME),
        categoryOverridesPath: resolve(expectedReconDir, TIMELINE_CATEGORY_OVERRIDES_FILENAME),
      });
    });

    it('should default to resolving the actual repo root based on the module', () => {
      const paths = resolveTimelineReconPaths();

      // Ensure the default repo root is an absolute path that seems like a repo root
      expect(paths.repoRoot).toBeTruthy();
      expect(typeof paths.repoRoot).toBe('string');

      const expectedReconDir = resolve(paths.repoRoot, '.local-reconciliation/timeline');
      expect(paths.reconDir).toBe(expectedReconDir);

      // Verify one of the specific paths to ensure the structure holds
      expect(paths.timelinePath).toBe(resolve(expectedReconDir, LOCATION_HISTORY_FILENAME));
    });
  });
});
