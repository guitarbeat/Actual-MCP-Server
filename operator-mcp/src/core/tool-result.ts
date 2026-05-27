import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function successResult(data: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: {
      ok: true,
      ...data,
    },
  };
}

export function errorResult(
  message: string,
  options?: { suggestion?: string; data?: Record<string, unknown> },
): CallToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: message }],
    structuredContent: {
      ok: false,
      message,
      suggestion: options?.suggestion,
      ...options?.data,
    },
  };
}

export function errorFromCatch(
  error: unknown,
  fallbackMessage: string,
): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return errorResult(message || fallbackMessage, {
    suggestion:
      "Verify OPERATOR_REPO_ROOT, path allowlist, and tool arguments.",
  });
}
