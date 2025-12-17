## 2024-05-23 - Pretty-Printing JSON Responses
**Learning:** Developers and LLMs both benefit from readable JSON in logs/inspector. While LLMs parse minified JSON fine, the "human in the loop" (debugger, user verifying output) struggles with massive one-line JSON blobs.
**Action:** Default to `JSON.stringify(data, null, 2)` for structured data responses in MCP servers unless payload size is critical.
