import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { formatMessage } from './safe-logger.js';

describe('formatMessage', () => {
  const originalShowStackTrace = process.env.MCP_SHOW_STACK_TRACE;

  beforeEach(() => {
    // Reset MCP_SHOW_STACK_TRACE before each test
    delete process.env.MCP_SHOW_STACK_TRACE;
  });

  afterEach(() => {
    // Restore MCP_SHOW_STACK_TRACE after each test
    process.env.MCP_SHOW_STACK_TRACE = originalShowStackTrace;
  });

  it('should include stack trace when MCP_SHOW_STACK_TRACE is true', () => {
    process.env.MCP_SHOW_STACK_TRACE = 'true';
    const error = new Error('Test error');
    const result = formatMessage([error]);
    expect(result).toContain('Test error');
    expect(result).toContain(error.stack);
  });

  // This test expects correct behavior (no leakage)
  it('should NOT include stack trace when MCP_SHOW_STACK_TRACE is not true', () => {
    delete process.env.MCP_SHOW_STACK_TRACE;
    const error = new Error('Test error');
    const result = formatMessage([error]);
    expect(result).toContain('Test error');
    expect(result).not.toContain(error.stack);
  });
});
