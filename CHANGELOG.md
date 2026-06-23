# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Budget backup/snapshot tools: `create-budget-snapshot`, `list-budget-snapshots`, `restore-budget-snapshot` (advanced tier) for capturing and restoring point-in-time budget state (#373)
- Native backup tools: `backup-budget`, `list-backups`, `restore-budget` (advanced tier) built on Actual's internal backup system, complementing the snapshot tools (#373)
- `ingest-statement-csv` tool (write core) to ingest a bank/credit-card statement CSV export into the local reconciliation/timeline workspace
- `POST /reconnect` endpoint (bearer-protected) for forcing a reconnect to the Actual Budget server after cold starts (#377)
- `withRetry` utility in `src/core/utils/retry.ts` with exponential backoff, configurable attempts, delay caps, and `shouldRetry` predicate (#371)
- Docker Compose configuration (`docker-compose.yml`) for local development and self-hosting with persistent volume and health checks (#372)
- Architecture overview, HTTP endpoints reference, troubleshooting guide, and environment variables table in `mcp-server/README.md` (#374, #376)
- Security audit step (`pnpm audit --audit-level=high`) in CI pipeline (#375)

### Fixed

- Repaired syntax errors in `historical-transfer-utils.test.ts` and `mcp/tools/index.test.ts` that were masking ~30 latent type errors; the full workspace now type-checks, lints, formats, and tests cleanly
- TypeScript build errors from mismatched imports in `actual-client.ts` and `http.ts`
- Missing `lastErrorAt` field in `ActualConnectionState` initialization and error marking
- Unused import lint error in `get-transactions/index.ts`
- Failing test for readiness health check in `actual-api.test.ts`

### Changed

- Timeline reconciliation tools (`audit-historical-transfers`, `apply-historical-transfers`) gained argument parsing and explicit path/candidate overrides
- Upgraded `@actual-app/api` from 26.3.0 to 26.5.1 (rate-limiting fix) (#400)
- Comprehensive test coverage: `parseHistoricalTransferCandidateId`, `buildHistoricalTransferCandidateId`, `toActualDbDate`, `shiftDateByDays`, `getDateDiffInDays`, `escapeRegExp`, `mapSettledWithConcurrency`, `getBudgetIdentifiers`, `CategoryClassifier`, `argument-parser`, `getHistoricalTransferInternalLayer`, property-based tests for `isValidHistoricalTransferTransaction` (#383-#399)
