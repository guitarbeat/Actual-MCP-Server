import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cacheService } from '../../cache/cache-service.js';
import { nameResolver } from '../../utils/name-resolver.js';
import { invalidateAllReadState, invalidateNameResolutionState } from './cache-helpers.js';

vi.mock('../../cache/cache-service.js', () => ({
  cacheService: {
    clear: vi.fn(),
  },
}));

vi.mock('../../utils/name-resolver.js', () => ({
  nameResolver: {
    clearCache: vi.fn(),
  },
}));

describe('cache-helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('invalidateAllReadState', () => {
    it('should clear both cacheService and nameResolver', () => {
      invalidateAllReadState();

      expect(cacheService.clear).toHaveBeenCalledTimes(1);
      expect(nameResolver.clearCache).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidateNameResolutionState', () => {
    it('should only clear nameResolver', () => {
      invalidateNameResolutionState();

      expect(nameResolver.clearCache).toHaveBeenCalledTimes(1);
      expect(cacheService.clear).not.toHaveBeenCalled();
    });
  });
});
