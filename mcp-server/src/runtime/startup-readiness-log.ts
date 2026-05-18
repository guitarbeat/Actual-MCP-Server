import { getReadinessSnapshot } from '../core/api/actual-client.js';

/** Deterministic startup snapshot line for tests and log drains (e.g. Render). */
export function formatStartupReadinessLogLine(): string {
  const r = getReadinessSnapshot();
  return `[STARTUP] actual_api status=${r.status} readiness=${String(r.ready)} reason=${String(r.reason)} lastError=${r.lastError ?? 'none'}`;
}

export function emitStartupReadinessLog(): void {
  try {
    console.error(formatStartupReadinessLogLine());
  } catch (error) {
    console.error('[STARTUP] failed to build readiness snapshot:', error);
  }
}
