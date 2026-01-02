# Sentinel Journal - Critical Security Learnings

This journal records ONLY critical security learnings, vulnerability patterns, and architectural gaps found in the codebase.

Format:
## YYYY-MM-DD - [Title]
**Vulnerability:** [What you found]
**Learning:** [Why it existed]
**Prevention:** [How to avoid next time]

## 2024-05-23 - [Timing Attack in Auth Token Comparison]
**Vulnerability:** The bearer token verification used simple string comparison (`token !== expectedToken`), which is vulnerable to timing attacks where an attacker can guess the token character by character based on response time.
**Learning:** Even in high-level languages like Node.js, string comparison operators short-circuit, leaking length and content information via timing side channels.
**Prevention:** Always use constant-time comparison functions (like `crypto.timingSafeEqual`) for sensitive values like API keys, passwords, and tokens. We implemented a helper `timingSafeStringEqual` that hashes inputs first to handle variable lengths safely.
