# Deploying to a self-hosted Coolify / Docker host

This guide covers running the Actual MCP server as a long-lived HTTP service on your own
infrastructure (Coolify, Portainer, or plain Docker), as an alternative to the Render
blueprint in the repository root. It uses placeholders only — substitute your own server
URL, domain, and secrets.

## What gets deployed

The image is built from [`mcp-server/Dockerfile`](../mcp-server/Dockerfile). Its entrypoint
runs the remote HTTP transport with bearer auth and write tools enabled:

```
node --require ./polyfill.cjs build/index.js --sse --enable-bearer --enable-write
```

- Listens on **port 3000** (`EXPOSE 3000`).
- `GET /health` — liveness. `GET /ready` — readiness (only `200` once it has
  authenticated to your Actual server and loaded a budget).
- The `/mcp` endpoint is protected by `BEARER_TOKEN`.

No command override is needed; the container is configured entirely through env vars.

## Required environment variables

| Var | Description |
|---|---|
| `ACTUAL_SERVER_URL` | Base URL of your Actual Budget server, e.g. `https://actual.example.com` |
| `ACTUAL_PASSWORD` | Your Actual Budget login password |
| `ACTUAL_BUDGET_SYNC_ID` | Budget Sync ID (UUID) from Actual → **Settings → Advanced → Sync ID** |
| `BEARER_TOKEN` | Long random secret (32+ chars) clients send as `Authorization: Bearer <token>`. Generate with `openssl rand -hex 32` |

Optional: `ACTUAL_BUDGET_ENCRYPTION_PASSWORD` (only for end-to-end-encrypted budgets),
`AUTO_SYNC_INTERVAL_MINUTES`, `MCP_SESSION_TTL_MINUTES`. See
[`mcp-server/README.md`](../mcp-server/README.md) for the full list.

> The most common deploy failure is `/ready` returning
> `{"reason":"authentication_failed"}` — that means `ACTUAL_SERVER_URL` /
> `ACTUAL_PASSWORD` are wrong. Confirm you can log into the Actual web UI with the same
> password before deploying.

## Coolify (web UI)

1. **+ New → Application → Public Repository**.
2. Repository: this repo's URL, branch `main`.
3. Build Pack: **Dockerfile**. Dockerfile location: `mcp-server/Dockerfile`. Base
   directory: `/`.
4. Port: **3000**. Set your domain (e.g. `https://actual-mcp.example.com`).
5. Add the four required env vars above.
6. Deploy. Coolify's reverse proxy (Traefik) handles TLS automatically once DNS for the
   domain resolves to the host.

> Do **not** put the MCP hostname behind an interactive SSO/identity proxy (e.g.
> Cloudflare Access). It is a machine-to-machine API authenticated by `BEARER_TOKEN`; an
> SSO redirect in front of `/mcp` will break MCP clients.

## Plain Docker / Compose

```bash
docker build -f mcp-server/Dockerfile -t actual-mcp .

docker run -d --name actual-mcp -p 3000:3000 \
  -e ACTUAL_SERVER_URL="https://actual.example.com" \
  -e ACTUAL_PASSWORD="<your-actual-password>" \
  -e ACTUAL_BUDGET_SYNC_ID="<budget-sync-id>" \
  -e BEARER_TOKEN="<long-random-token>" \
  actual-mcp
```

Front it with your existing reverse proxy (Traefik, Caddy, nginx) terminating TLS and
forwarding to container port 3000.

## Verify

```bash
curl -s https://actual-mcp.example.com/health   # {"status":"ok",...}
curl -s https://actual-mcp.example.com/ready     # {"ready":true,...}
```

If `/ready` is not `200`, the JSON `reason` tells you which credential to fix
(`authentication_failed` → password/URL; `no_budgets_found` / `budget_not_loaded` →
sync ID). Classification lives in
[`mcp-server/src/core/api/actual-client/connection.ts`](../mcp-server/src/core/api/actual-client/connection.ts).

## Connect a client

```bash
claude mcp add --transport http actual-mcp \
  https://actual-mcp.example.com/mcp \
  --header "Authorization: Bearer <BEARER_TOKEN>"
```
</content>
