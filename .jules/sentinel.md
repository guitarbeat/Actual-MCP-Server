## 2024-05-22 - Bearer Token Timing Attack
**Vulnerability:** The inline bearer token comparison used `token !== expectedToken`, which is susceptible to timing attacks (leaking the length of the matching prefix).
**Learning:** Even simple string comparisons for secrets can be vulnerable. Node.js provides `crypto.timingSafeEqual` for this exact purpose, but it requires buffers of equal length.
**Prevention:** Always use `crypto.timingSafeEqual` for comparing secrets. Refactor auth logic into dedicated middleware to ensure consistency and testability.
