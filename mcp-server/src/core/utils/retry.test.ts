import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withRetry } from './retry.js';

describe('withRetry', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('succeeds on first attempt and calls worker exactly once', async () => {
    const worker = vi.fn().mockResolvedValue('success');
    const result = await withRetry(worker);
    expect(result).toBe('success');
    expect(worker).toHaveBeenCalledTimes(1);
  });

  it('retries on failure then succeeds on second attempt', async () => {
    const error = new Error('transient');
    const worker = vi.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

    const result = await withRetry(worker, { maxAttempts: 3, baseDelayMs: 0 });
    expect(result).toBe('success');
    expect(worker).toHaveBeenCalledTimes(2);
  });

  it('throws after maxAttempts exhausted and calls worker maxAttempts times', async () => {
    const error = new Error('persistent');
    const worker = vi.fn().mockRejectedValue(error);

    await expect(withRetry(worker, { maxAttempts: 3, baseDelayMs: 0 })).rejects.toThrow(
      'persistent',
    );
    expect(worker).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry when shouldRetry returns false', async () => {
    const error = new Error('non-retryable');
    const worker = vi.fn().mockRejectedValue(error);

    await expect(
      withRetry(worker, { maxAttempts: 3, baseDelayMs: 0, shouldRetry: () => false }),
    ).rejects.toThrow('non-retryable');
    expect(worker).toHaveBeenCalledTimes(1);
  });

  it('uses default maxAttempts=3 when not specified', async () => {
    const error = new Error('fail');
    const worker = vi.fn().mockRejectedValue(error);

    await expect(withRetry(worker, { baseDelayMs: 0 })).rejects.toThrow('fail');
    expect(worker).toHaveBeenCalledTimes(3);
  });

  it('applies exponential backoff delay between retries', async () => {
    vi.useFakeTimers();

    const error = new Error('transient');
    const worker = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('done');

    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

    const promise = withRetry(worker, {
      maxAttempts: 3,
      baseDelayMs: 500,
      maxDelayMs: 10000,
    });

    // Advance timers enough to cover both delays
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('done');
    expect(worker).toHaveBeenCalledTimes(3);

    // First delay: 500 * 2^0 = 500ms (jitter=0 because Math.random mocked to 0)
    // Second delay: 500 * 2^1 = 1000ms
    const delays = setTimeoutSpy.mock.calls.map((call) => call[1]);
    expect(delays[0]).toBe(500);
    expect(delays[1]).toBe(1000);

    vi.useRealTimers();
  });

  it('caps delay at maxDelayMs', async () => {
    vi.useFakeTimers();

    const error = new Error('transient');
    const worker = vi.fn().mockRejectedValueOnce(error).mockResolvedValue('done');

    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

    const promise = withRetry(worker, {
      maxAttempts: 2,
      baseDelayMs: 500,
      maxDelayMs: 100,
    });

    await vi.runAllTimersAsync();
    await promise;

    const delays = setTimeoutSpy.mock.calls.map((call) => call[1]);
    expect(delays[0]).toBe(100);

    vi.useRealTimers();
  });
});
