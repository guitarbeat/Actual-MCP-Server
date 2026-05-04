// Polyfill browser globals required by @actual-app/api at module load time.
// navigator.platform is referenced at the top level of bundle.api.js; Node.js
// has no navigator global so the process crashes on startup without this.
// Import this module before any `@actual-app/api` import in ESM entrypoints.
if (typeof globalThis.navigator === 'undefined') {
  globalThis.navigator = {
    platform: process.platform,
    userAgent: 'node',
  } as unknown as Navigator;
}
