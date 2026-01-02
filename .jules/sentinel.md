## 2024-05-23 - Timing Attack in Authentication
**Vulnerability:** The Bearer token validation used simple string comparison (`token !== expectedToken`) and logged the length of the received token. This allowed timing attacks (determining the token character by character) and leaked information about the expected token length.
**Learning:** Even simple equality checks for secrets can be vulnerable. `node:crypto` provides `timingSafeEqual`, but it requires buffers of equal length.
**Prevention:** Use `timingSafeStringEqual` (which hashes inputs first) for all secret comparisons. Never log lengths or values of invalid secrets.
