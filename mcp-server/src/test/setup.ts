if (!('navigator' in globalThis)) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { platform: process.platform },
    configurable: true,
  });
}
