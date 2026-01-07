## 2025-05-23 - [Semantic Dashboard Structure]
**Learning:** Server-side rendered dashboards (via template strings) often default to `div` soup, missing opportunities for semantic structures like `<dl>` (Description Lists) for key-value stats and `<ul>` for lists, which significantly improves screen reader navigation.
**Action:** When generating HTML strings, always check if a list of stats can be a `<dl>` and a list of items can be a `<ul>`/`<ol>`.
