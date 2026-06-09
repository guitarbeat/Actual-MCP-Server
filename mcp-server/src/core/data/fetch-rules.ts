import type { RuleEntity } from '../../core/api/api-types.js';
import { getRules } from '../../core/api/actual-client.js';

export async function fetchAllRules(): Promise<RuleEntity[]> {
  return getRules();
}
