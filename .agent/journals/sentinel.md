## 2024-03-24 - Timing Attacks on Bearer Tokens
**Vulnerability:** The bearer token validation used a direct string comparison (`token !== expectedToken`), which is vulnerable to timing attacks. An attacker could theoretically deduce the token character by character by measuring the response time.
**Learning:** Even simple string comparisons for secrets can be a security risk. Node.js `crypto.timingSafeEqual` operates on buffers of equal length, so standard strings need careful handling or hashing first.
**Prevention:** Always use constant-time comparison functions for secrets. Hashing both inputs (e.g. SHA-256) before comparison allows using `timingSafeEqual` safely even if the original strings have different lengths.
