## 2024-05-23 - [Semantic HTML in Server-Rendered Dashboards]
**Learning:** Server-rendered dashboards often rely on generic `<div>` tags which harm accessibility. Screen readers benefit significantly from semantic structures like `<dl>`/`<dt>`/`<dd>` for key-value pairs and `<ul>`/`<li>` for lists.
**Action:** Always refactor generic statistic grids into Description Lists (`<dl>`) and item lists into Unordered Lists (`<ul>`) to ensure proper semantic hierarchy.
