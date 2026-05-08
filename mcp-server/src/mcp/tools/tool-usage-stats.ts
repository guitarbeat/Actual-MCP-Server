/** In-memory MCP tool invocation counts (process lifetime). Exported for focused tests only. */
const toolInvocationTotals = new Map<string, number>();

let usageSummaryInterval: NodeJS.Timeout | null = null;

export function resetToolInvocationStats(): void {
  toolInvocationTotals.clear();
}

export function recordToolInvocation(toolName: string): void {
  toolInvocationTotals.set(toolName, (toolInvocationTotals.get(toolName) ?? 0) + 1);
}

export function peekToolInvocationStats(): Record<string, number> {
  return Object.fromEntries(
    [...toolInvocationTotals.entries()].sort(([a], [b]) => a.localeCompare(b)),
  );
}

/**
 * When `MCP_TOOL_USAGE_SUMMARY_INTERVAL_SEC` is a positive integer, logs top MCP tools every interval.
 */
export function scheduleToolUsageSummaryIfEnabled(): void {
  if (usageSummaryInterval) {
    return;
  }

  const seconds = Number.parseInt(process.env.MCP_TOOL_USAGE_SUMMARY_INTERVAL_SEC ?? '', 10);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return;
  }

  usageSummaryInterval = setInterval(() => {
    const entries = [...toolInvocationTotals.entries()].sort((left, right) => right[1] - left[1]);

    const topSlice = entries.slice(0, 35);
    if (topSlice.length === 0) {
      console.error('[TOOL_USAGE_SUMMARY] (no MCP tool executions recorded yet)');
      return;
    }

    const payload = Object.fromEntries(topSlice);
    console.error(
      `[TOOL_USAGE_SUMMARY] top_counts=${JSON.stringify(payload)} tracked_unique=${entries.length}`,
    );
  }, seconds * 1000);

  usageSummaryInterval.unref?.();
}

export function shutdownToolUsageSummary(): void {
  if (usageSummaryInterval) {
    clearInterval(usageSummaryInterval);
    usageSummaryInterval = null;
  }
}
