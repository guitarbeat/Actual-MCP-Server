/**
 * Input parser for get-accounts tool
 * This tool has no input arguments, but we include this for consistency
 */

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ParsedGetAccountsInput {
  // No input arguments for this tool
}

export class GetAccountsInputParser {
  /**
   * Parse and validate get accounts arguments
   * This tool has no arguments, so this is a no-op for consistency
   *
   * @returns Empty parsed input
   */
  parse(): ParsedGetAccountsInput {
    return {};
  }
}
