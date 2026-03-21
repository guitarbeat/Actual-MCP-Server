import type { ReconcileAccountArgs } from './types.js';
import { ReconcileAccountArgsSchema } from './types.js';

export class ReconcileAccountInputParser {
  parse(args: unknown): ReconcileAccountArgs {
    return ReconcileAccountArgsSchema.parse(args);
  }
}
