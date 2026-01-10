## 2024-05-22 - Fixed Timing Attack in Bearer Auth
**Vulnerability:** Simple string comparison (`token !== expectedToken`) in Bearer authentication allowed potential timing attacks.
**Learning:** Even simple string comparisons for secrets can leak information via execution time differences.
**Prevention:** Used `timingSafeStringEqual` (based on `crypto.timingSafeEqual`) for all secret comparisons.
