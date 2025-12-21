## 2024-05-23 - Timing Attacks on Authentication Tokens
**Vulnerability:** The Bearer token validation used simple string comparison (`token !== expectedToken`), which is vulnerable to timing attacks where an attacker can deduce the token byte-by-byte based on response time differences.
**Learning:** Standard string comparison operators in many languages (including JavaScript) fail fast on the first mismatched character. This optimization leaks information about how much of the string matched.
**Prevention:** Always use constant-time comparison functions for secrets. In Node.js, `crypto.timingSafeEqual` is the standard tool. Since `timingSafeEqual` requires equal-length buffers, hashing the inputs (e.g., via SHA-256) first is a robust pattern to handle variable-length inputs safely.
