import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { OperatorRuntimeConfig } from "./config.js";
import { timingSafeStringEqual } from "./auth.js";
import { validateOperatorApprovalSecret } from "./startup-guard.js";
import { errorFromCatch, errorResult } from "./tool-result.js";

export function verifyApprovalSecret(
  config: OperatorRuntimeConfig,
  approvalSecret: string,
): CallToolResult | null {
  try {
    validateOperatorApprovalSecret(config.approvalSecret);
  } catch (error) {
    return errorFromCatch(
      error,
      "OPERATOR_APPROVAL_SECRET is not configured on the server",
    );
  }

  if (!timingSafeStringEqual(approvalSecret, config.approvalSecret)) {
    return errorResult("Invalid approval secret");
  }

  return null;
}
