## 2024-05-23 - [Security Headers Architecture]
**Vulnerability:** The application was missing standard security headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options) and exposed the `X-Powered-By` header, which could facilitate reconnaissance and various attacks (XSS, Clickjacking, MIME sniffing).
**Learning:** Even internal-facing tools or development servers benefit from defense-in-depth strategies. Implementing a strict Content Security Policy (CSP) requires careful consideration of inline styles and scripts used by server-side rendering logic (like the dashboard).
**Prevention:** I implemented a dedicated `securityHeaders` middleware in `src/core/transport/security-headers.ts` that enforces these headers by default. Future endpoints must respect the established CSP (e.g., avoiding inline scripts) or explicitly adjust the policy if absolutely necessary.

## 2024-05-24 - [Insecure Query Parameter Authentication]
**Vulnerability:** The main server entry point (`src/index.ts`) implemented an inline authentication middleware that accepted Bearer tokens via URL query parameters (`?token=...`), violating the project's security policy and risking token leakage in server logs and browser history.
**Learning:** Security logic should not be duplicated or re-implemented inline when established, tested security modules exist. The divergence between the `src/core/auth` implementation (secure) and `src/index.ts` (insecure) went unnoticed because the entry point wasn't using the shared module.
**Prevention:** I refactored `src/index.ts` to use the standardized `createBearerAuth` middleware from `src/core/auth/bearer-auth.ts`, which strictly enforces the `Authorization` header. Future changes to entry points should verify they utilize core security primitives rather than ad-hoc implementations.

## 2024-05-25 - [Stack Trace Leakage in Production Logs]
**Vulnerability:** The `unhandledRejection` handler in the main server entry point (`src/index.ts`) was logging full stack traces to the console regardless of the environment. In production, this can expose sensitive internal details (file paths, dependency versions, code structure) to unauthorized viewers of the logs.
**Learning:** While stack traces are vital for debugging in development, they must be suppressed or securely handled in production. Consistency in logging practices is key—other parts of the system (like `response-builder.ts`) were already correctly checking `NODE_ENV`.
**Prevention:** I updated the `unhandledRejection` handler to check `if (process.env.NODE_ENV !== 'production')` before logging stack traces. This enforces the "fail securely" principle by ensuring that errors in production do not reveal internal state.

## 2024-05-26 - [Overly Permissive CORS Configuration]
**Vulnerability:** The server was configured with `Access-Control-Allow-Origin: *`, allowing any malicious website to interact with the local MCP server if the user is authenticated or if authentication is disabled (default).
**Learning:** Default configurations for local servers must still be secure against web-based attacks (CSRF/CORS). Relying on the assumption that "it runs locally" is insufficient when browsers are involved as clients.
**Prevention:** I implemented a strict `corsMiddleware` in `src/core/transport/cors.ts` that whitelists `localhost`, `127.0.0.1`, and explicitly configured origins via `MCP_ALLOWED_ORIGINS`, rejecting all others.
