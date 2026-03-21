# Engineering Notes

This repository keeps a few implementation notes in version control so contributors can preserve hard-earned context without relying on personal local tooling.

## Performance

- Prefer persistent connections and cache reuse over re-initializing the Actual API on every request.
- Start independent async work before `Promise.all(...)`; do not `await` inside the array literal.
- In hot aggregation paths, prefer `for...in` loops over `Object.values()` when avoiding intermediate allocations matters.
- Use in-place `Array.prototype.sort()` when the array is locally owned and immutability is not required.

## Security

- Keep transport security in shared middleware, not inline in entrypoints.
- Bearer token validation must stay header-only and use constant-time comparison.
- Do not expose raw internal error messages in HTTP 500 responses.
- Keep CSP strict; avoid adding inline script or style exceptions unless there is no safer option.

## Server-Rendered Dashboard UX

- Prefer semantic HTML such as `<dl>` and `<ul>` for stats and lists.
- Use semantic status tokens from logic and map them to styles in CSS instead of returning hardcoded colors from TypeScript.
- Any transient UI feedback should be accessible with `role=\"status\"` or `aria-live`.
- When inline browser behavior is necessary, use a nonce-based CSP-compatible approach.
