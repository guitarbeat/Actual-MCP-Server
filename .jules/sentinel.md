## 2024-05-23 - Timing Attack Prevention
**Vulnerability:** String comparison of authentication tokens was using standard equality operators (`===` or `!==`), which returns as soon as a character mismatch is found. This timing difference leaks information about the correct token byte by byte.
**Learning:** Even in high-level languages like JavaScript/TypeScript, timing attacks are possible when comparing secrets.
**Prevention:** Always use `crypto.timingSafeEqual` (or a wrapper around it like `timingSafeStringEqual` for strings) when comparing sensitive values like tokens, passwords, or hashes. This ensures the comparison takes the same amount of time regardless of the input.
