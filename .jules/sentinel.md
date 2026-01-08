## 2024-03-24 - [Critical] Bearer Token Exposure in Query Parameters
**Vulnerability:** The server accepted authentication tokens via URL query parameters (`?token=...`), which were processed in `src/index.ts`.
**Learning:** URL query parameters are often logged in server access logs, proxy logs, and browser history. Passing sensitive credentials (like bearer tokens) in the URL can lead to their exposure to unauthorized parties who have access to these logs.
**Prevention:** Always enforce the use of the standard `Authorization` HTTP header for transmitting bearer tokens. Do not support alternative methods that compromise security for convenience, especially when they risk credential leakage. Removed the query parameter fallback in the authentication middleware.
