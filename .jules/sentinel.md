## 2024-05-23 - [Missing Security Headers]
**Vulnerability:** The application was missing standard security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy) and had no Content Security Policy (CSP).
**Learning:** Even internal tools or "Poke" apps can be exposed to risks if running in a browser context. A lack of CSP makes it harder to defend against XSS if other vulnerabilities appear.
**Prevention:** Always include a baseline set of security headers and a restrictive CSP in all Express applications, even if they are internal or development tools.
