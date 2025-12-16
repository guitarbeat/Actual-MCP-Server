## 2024-05-23 - Timing Attacks on Bearer Tokens
**Vulnerability:** The server was using direct string comparison (`===`) for validating Bearer tokens in `mcp-server/src/index.ts`. It was also logging the length of the invalid token.
**Learning:** String comparisons terminate early when a mismatch is found, allowing an attacker to deduce the token character by character by measuring response times. Logging token length also leaks information about the secret.
**Prevention:** Use constant-time comparison functions (like `crypto.timingSafeEqual`) for all secret validations. Never log lengths or content of secrets in error messages.
