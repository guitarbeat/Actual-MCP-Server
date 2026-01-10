## 2024-05-22 - Semantic HTML for Dashboards
**Learning:** Using semantic HTML (`<dl>`, `<ul>`) for server-rendered dashboards is a low-effort, high-impact accessibility win. It allows screen readers to correctly announce list counts and key-value relationships without needing complex ARIA attributes.
**Action:** Always prefer `<dl>` for stats grids and `<ul>` for list-like data over generic `<div>` containers in server-rendered templates.

## 2025-01-10 - Server-Rendered Dashboard Accessibility
**Learning:** Server-rendered dashboards using template strings often miss basic accessibility features like ARIA roles and proper heading structures, and default colors (e.g., Tailwind 500 shades) may lack sufficient contrast on light backgrounds.
**Action:** Always verify contrast ratios for text colors in both light and dark modes, and ensure decorative elements (like status dots) are hidden from screen readers using `aria-hidden="true"`. Use semantic tags (e.g., `<h2>`) instead of styled `<div>`s for section headers.
