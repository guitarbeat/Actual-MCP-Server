---
trigger: always_on
description: Mandatory usage of Smart Coding MCP tools for dependencies and search
---

# Smart Coding MCP Usage Rules

You must prioritize using the **Smart Coding MCP** tools for the following tasks.

## 1. Dependency Management

**Trigger:** When checking, adding, or updating package versions (npm, python, go, rust, etc.).
**Action:**

- **MUST** use the `d_check_last_version` tool.
- **DO NOT** guess versions or trust internal training data.
- **DO NOT** use generic web search unless `d_check_last_version` fails.

## 2. Codebase Research

**Trigger:** When asking about "how" something works, finding logic, or understanding architecture.
**Action:**

- **PREFER** `semantic_search` (Smart Coding) over `grep_search` or `find_by_name`.
- Use `semantic_search` for natural language queries (e.g., "where is the auth logic").
- Use standard tools (`grep`) only for exact string matching.

## 3. Environment & Status

**Trigger:** When starting a session or debugging the environment.
**Action:**

- Use `e_set_workspace` if the current workspace path is incorrect.
- Use `f_get_status` to verify the MCP server is healthy and indexed.
