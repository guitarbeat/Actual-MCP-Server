import { AsyncLocalStorage } from 'node:async_hooks';

export interface McpInvocationLabels {
  requestId: string;
  /** Lowercase MCP-Session-Id header when present */
  mcpSessionId?: string;
}

export const mcpInvocationStore = new AsyncLocalStorage<McpInvocationLabels>();

export function truncateCorrelationId(id: string, length = 8): string {
  return id.slice(0, Math.min(length, id.length));
}

export function formatMcpCorrelationLogPrefix(): string {
  const store = mcpInvocationStore.getStore();
  if (!store) {
    return '';
  }

  const req = truncateCorrelationId(store.requestId);
  const sess = store.mcpSessionId ? truncateCorrelationId(store.mcpSessionId) : '';

  return sess.length > 0 ? `[mcp corr=${req} sess=${sess}] ` : `[mcp corr=${req}] `;
}
