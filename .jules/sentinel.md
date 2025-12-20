## 2025-12-20 - [Timing Attack Mitigation]
**Vulnerability:** Bearer token validation used standard string comparison, which is susceptible to timing attacks.
**Learning:** Standard string comparison returns early on mismatch, leaking length and content information.
**Prevention:** Use constant-time comparison (e.g., `timingSafeStringEqual`) for all secret validations.
