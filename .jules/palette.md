## 2024-05-22 - Semantic HTML for Dashboards
**Learning:** Using semantic HTML (`<dl>`, `<ul>`) for server-rendered dashboards is a low-effort, high-impact accessibility win. It allows screen readers to correctly announce list counts and key-value relationships without needing complex ARIA attributes.
**Action:** Always prefer `<dl>` for stats grids and `<ul>` for list-like data over generic `<div>` containers in server-rendered templates.

## 2025-01-10 - Server-Rendered Dashboard Accessibility
**Learning:** Server-rendered dashboards using template strings often miss basic accessibility features like ARIA roles and proper heading structures, and default colors (e.g., Tailwind 500 shades) may lack sufficient contrast on light backgrounds.
**Action:** Always verify contrast ratios for text colors in both light and dark modes, and ensure decorative elements (like status dots) are hidden from screen readers using `aria-hidden="true"`. Use semantic tags (e.g., `<h2>`) instead of styled `<div>`s for section headers.

## 2025-02-24 - Hardcoded Colors vs CSS Variables
**Learning:** Returning hardcoded hex codes from JavaScript logic (e.g., `getStatusDetails`) breaks theme adaptability and often fails contrast checks in one of the modes. Using semantic class names or CSS variables allows the browser to handle theming and contrast correctly.
**Action:** Return semantic types (e.g., 'success', 'warning') from JS logic and map them to CSS variables in the styles.

## 2026-01-25 - Secure Micro-Interactions in Server-Rendered Views
**Learning:** Adding client-side interactivity (like clipboard copy) to server-rendered dashboards requires careful handling of CSP. Using a nonce for inline scripts is cleaner than relaxing CSP with `'unsafe-inline'`, maintaining high security for simple tools.
**Action:** When enhancing server-rendered pages, generate a cryptographic nonce in middleware, pass it to the view, and use it for any necessary inline logic or event binding scripts.

## 2026-01-25 - Accessible Status Feedback
**Learning:** Visual-only tooltips for transient states (like "Copied!") are invisible to screen readers. Adding `role="status"` and `aria-live="polite"` makes these updates accessible without disrupting the user flow.
**Action:** Ensure all temporary visual feedback elements include appropriate ARIA roles and live region attributes.

## 2026-01-26 - Respecting Reduced Motion Preferences
**Learning:** CSS animations like pulsing indicators can be distracting or harmful to users with vestibular disorders. Always wrapping continuous animations in `@media (prefers-reduced-motion: no-preference)` ensures they are only shown to users who haven't requested reduced motion.
**Action:** Wrap all decorative, continuous animations in this media query.
