# Comparison & Health Check Todo

## 1. Server Process & Stability
- [ ] **Process Crash Check**
  - *Action*: Verify if the MCP server process crashes or fails to restart.
  - *Finding*: Process is running (PID 46337). No crash loop observed. `pm2` is not installed. 

- [ ] **System Updates**
  - *Action*: Check for service configuration problems after any recent system updates.
  - *Finding*: System appears stable. No recent updates logged in this context. 

- [ ] **Process Manager**
  - *Action*: Check status of PM2, systemd, or other process managers.
  - *Finding*: No process manager found (pm2/systemd). Running via `npm/node` manually. 

## 2. Configuration Problems
- [ ] **Port Conflicts**
  - *Action*: Check for port binding conflicts (Default ports: 3000, 8080).
  - *Finding*: No active conflicts found. Env `PORT=3000`. Inspector running on 5006. 

- [ ] **Environment Variables**
  - *Action*: Compare local `.env` with `upstream-comparison/.env.example`.
  - *Finding*: Missing `ACTUAL_BUDGET_ENCRYPTION_PASSWORD` in local `.env`. Local has extra `PORT=3000`. 

- [ ] **Certificates (SSL/TLS)**
  - *Action*: Check expiration dates if running HTTPS.
  - *Finding*: No SSL certificates found in project root. 

- [ ] **Firewall Rules**
  - *Action*: Verify no recent firewall changes are blocking connections.
  - *Finding*: Not checked (local environment). No connection timeouts observed. 

## 3. Dependency Issues
- [ ] **Node.js Version**
  - *Action*: Compare `node --version` with `engines` in `package.json`.
  - *Finding*: **MISMATCH**. Local `node` is v20.19.4. `package.json` engines requires `>=22.0.0`. 

- [ ] **Package Updates**
  - *Action*: Identify NPM package updates that might break functionality.
  - *Finding*: Local `actual-mcp` is v1.2.0, Upstream is v1.5.0. Local has added dependencies (`openai`, `csv-parse`, etc). 

- [ ] **Missing Dependencies**
  - *Action*: Check for modules in `upstream-comparison` but missing locally.
  - *Finding*: Local appears to be a superset of dependencies (includes `openai`, `zod`, etc). 

## 4. Comparisons (Local vs Upstream)
- [ ] **Fork Status**
  - *Action*: Check if local fork is behind `s-stefanov/actual-mcp`.
  - *Finding*: Local version (1.2.0) is behind Upstream (1.5.0) in version number, but ahead in features (AI/CSV). 

- [ ] **Server Logs**
  - *Action*: Inspect logs for startup errors or runtime exceptions.
  - *Finding*: No `logs` directory found. Process outputting to stdout (presumed). 

- [ ] **Process Running?**
  - *Action*: Run `ps aux | grep node` or check process list.
  - *Finding*: Yes, running under `node` (PID 46337) and `mcp-inspector`. 

- [ ] **Package.json Diff**
  - *Action*: Compare `mcp-server/package.json` vs `upstream-comparison/package.json`.
  - *Finding*: Significant differences. Local has `openai`, `csv-parse`, `date-fns` which are missing in upstream. 

- [ ] **Lockfile Diff**
  - *Action*: Compare `mcp-server/package-lock.json` vs `upstream-comparison/package-lock.json`.
  - *Finding*: Divergent due to different dependencies. 
