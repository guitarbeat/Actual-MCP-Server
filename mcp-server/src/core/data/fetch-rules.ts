import type { RuleEntity } from '@actual-app/api/@types/loot-core/src/types/models/rule.js';
import { getRules } from '../../core/api/actual-client.js';

export async function fetchAllRules(): Promise<RuleEntity[]> {
  return getRules();
}
