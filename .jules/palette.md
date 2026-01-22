## 2024-05-22 - Semantic HTML for Dashboards
**Learning:** Using semantic HTML (`<dl>`, `<ul>`) for server-rendered dashboards is a low-effort, high-impact accessibility win. It allows screen readers to correctly announce list counts and key-value relationships without needing complex ARIA attributes.
**Action:** Always prefer `<dl>` for stats grids and `<ul>` for list-like data over generic `<div>` containers in server-rendered templates.

## 2025-01-10 - Server-Rendered Dashboard Accessibility
**Learning:** Server-rendered dashboards using template strings often miss basic accessibility features like ARIA roles and proper heading structures, and default colors (e.g., Tailwind 500 shades) may lack sufficient contrast on light backgrounds.
**Action:** Always verify contrast ratios for text colors in both light and dark modes, and ensure decorative elements (like status dots) are hidden from screen readers using `aria-hidden="true"`. Use semantic tags (e.g., `<h2>`) instead of styled `<div>`s for section headers.

## 2025-02-24 - Hardcoded Colors vs CSS Variables
**Learning:** Returning hardcoded hex codes from JavaScript logic (e.g., `getStatusDetails`) breaks theme adaptability and often fails contrast checks in one of the modes. Using semantic class names or CSS variables allows the browser to handle theming and contrast correctly.
**Action:** Return semantic types (e.g., 'success', 'warning') from JS logic and map them to CSS variables in the styles.

## 2025-02-25 - Zero-JS Copy UX
**Learning:** In strict Content Security Policy environments where `script-src` is `'none'`, standard "Copy to Clipboard" buttons are impossible. However, CSS `user-select: all` provides a surprisingly good fallback by allowing users to select the entire string with a single click.
**Action:** Use `user-select: all` on read-only technical strings (like API keys, paths, or IDs) when JavaScript interactivity is constrained.
