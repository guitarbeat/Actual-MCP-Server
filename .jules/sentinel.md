## 2024-05-23 - [Timing Attack Prevention]
**Vulnerability:** The authentication token was compared using standard inequality (`!==`), which fails early upon character mismatch, allowing potential timing attacks to deduce the token.
**Learning:** Even simple string comparisons for secrets can be a security vector. Node.js provides `crypto.timingSafeEqual` for this purpose.
**Prevention:** Always use constant-time comparison functions for secrets, tokens, and hashes.
