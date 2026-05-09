import type { RuleEntity } from '../api/actual-client/types.js';
import { getRules } from '../../core/api/actual-client.js';

export async function fetchAllRules(): Promise<RuleEntity[]> {
  return getRules();
}
