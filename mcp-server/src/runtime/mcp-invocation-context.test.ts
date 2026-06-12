import { describe, expect, it } from 'vitest';
import {
  mcpInvocationStore,
  truncateCorrelationId,
  formatMcpCorrelationLogPrefix,
} from './mcp-invocation-context.js';

describe('truncateCorrelationId', () => {
  it('returns first 8 characters by default', () => {
    expect(truncateCorrelationId('abcdefghijklmn')).toBe('abcdefgh');
  });

  it('respects custom length', () => {
    expect(truncateCorrelationId('abcdefghijklmn', 4)).toBe('abcd');
  });

  it('returns the full string if shorter than the length', () => {
    expect(truncateCorrelationId('abc', 8)).toBe('abc');
  });

  it('handles empty string', () => {
    expect(truncateCorrelationId('', 8)).toBe('');
  });

  it('truncates to exactly the requested length', () => {
    expect(truncateCorrelationId('12345678', 8)).toBe('12345678');
  });
});

describe('mcpInvocationStore', () => {
  it('runs a callback with the provided context', async () => {
    const context = { requestId: 'req-123', mcpSessionId: 'sess-456' };
    let captured: typeof context | undefined;

    await mcpInvocationStore.run(context, async () => {
      const store = mcpInvocationStore.getStore();
      if (store) {
        captured = { requestId: store.requestId, mcpSessionId: store.mcpSessionId ?? '' };
      }
    });

    expect(captured).toEqual(context);
  });

  it('returns undefined outside of a run context', () => {
    expect(mcpInvocationStore.getStore()).toBeUndefined();
  });
});

describe('formatMcpCorrelationLogPrefix', () => {
  it('returns empty string when no store context is active', () => {
    expect(formatMcpCorrelationLogPrefix()).toBe('');
  });

  it('returns prefix with request id and session id when both are present', async () => {
    let prefix = '';

    await mcpInvocationStore.run(
      { requestId: 'abcdefghijklmn', mcpSessionId: 'session-xyz-abc' },
      async () => {
        prefix = formatMcpCorrelationLogPrefix();
      },
    );

    expect(prefix).toContain('abcdefgh');
    expect(prefix).toContain('session-');
    expect(prefix).toMatch(/\[mcp corr=.+ sess=.+\] /);
  });

  it('returns prefix without session when mcpSessionId is not set', async () => {
    let prefix = '';

    await mcpInvocationStore.run({ requestId: 'abcdefghijklmn' }, async () => {
      prefix = formatMcpCorrelationLogPrefix();
    });

    expect(prefix).toContain('abcdefgh');
    expect(prefix).toMatch(/\[mcp corr=.+\] /);
    expect(prefix).not.toContain('sess=');
  });
});
