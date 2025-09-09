# Copilot Instructions for Actual Budget MCP Server

## Project Architecture
- Main entry: `src/index.ts` (MCP server initialization, transport setup)
- Actual Budget API: `src/actual-api.ts` (connection lifecycle, API wrappers)
- Tools: Each tool in `src/tools/<tool>/` follows:
  - `index.ts`: Schema + handler
  - `input-parser.ts`: Argument validation
  - `data-fetcher.ts`: Data retrieval
  - `report-generator.ts`: Output formatting
  - `types.ts`: Tool-specific types
- Core utilities: `src/core/` (shared logic for data, mapping, aggregation)

## Developer Workflows
- Build: `npm run build` (TypeScript → build/)
- Watch: `npm run watch` (auto-rebuild)
- Test: `npm run test` (Vitest)
- Lint/Format: `npm run lint`, `npm run format`
- Type-check: `npm run type-check`
- Quality: `npm run quality` (all checks)
- Docker: `docker compose up --build -d` (local image)

## Patterns & Conventions
- All tools must export `schema` and `handler` in their `index.ts`.
- Use Zod for argument schemas, defined in `src/types.ts`.
- Tests are co-located as `.test.ts` files next to source.
- Use ESM imports, strict TypeScript, and explicit types.
- Environment variables via `.env` (never hardcode secrets).
- Use process.env for config in code and Docker.
- Never commit secrets; use `.dockerignore` and clean history if leaked.

## Integration & Communication
- MCP server uses `@modelcontextprotocol/sdk` for protocol and transport.
- Tools are registered in `src/tools/index.ts` and exposed via MCP.
- For write tools, start server with `--enable-write`.
- Use MCP Inspector (`npx @modelcontextprotocol/inspector node build/index.js --enable-write`) for debugging and tool listing.

## Examples
- Tool pattern: See `src/tools/create-transaction/` for full modular example.
- Test pattern: See `src/tools/create-transaction/data-fetcher.test.ts`.
- Docker pattern: See `docker-compose.yml` and `.dockerignore`.

## AI Agent Rules
- Never hallucinate APIs/libraries; use only what is present in package.json.
- Ask for clarification if context is missing.
- Never overwrite or delete code unless explicitly instructed.
- Always update README.md and documentation when changing features or setup.
- Use inline comments for non-obvious logic and # Reason: for complex decisions.

---
For more details, see `README.md` and `CLAUDE.md`.
