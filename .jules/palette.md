## 2024-05-22 - Semantic HTML for Dashboards
**Learning:** Using semantic HTML (`<dl>`, `<ul>`) for server-rendered dashboards is a low-effort, high-impact accessibility win. It allows screen readers to correctly announce list counts and key-value relationships without needing complex ARIA attributes.
**Action:** Always prefer `<dl>` for stats grids and `<ul>` for list-like data over generic `<div>` containers in server-rendered templates.
