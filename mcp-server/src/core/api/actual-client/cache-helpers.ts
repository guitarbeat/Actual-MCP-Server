import { cacheService } from '../../cache/cache-service.js';
import { nameResolver } from '../../utils/name-resolver.js';

export function invalidateAllReadState(): void {
  cacheService.clear();
  nameResolver.clearCache();
}

export function invalidateNameResolutionState(): void {
  nameResolver.clearCache();
}
