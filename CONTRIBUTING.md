# Contributing to Actual Budget MCP Server

Thank you for your interest in contributing! This document outlines the standards and process for contributing to this repository.

## Development Environment

This repository is managed as a `pnpm` workspace with the MCP server as the primary package.

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 10

## Code Standards

We adhere to strict coding standards to maintain quality and consistency.

### Linting & Formatting

- **Linting**: We use [ESLint](https://eslint.org/) with [Airbnb](https://github.com/airbnb/javascript) rules (TypeScript).
- **Formatting**: We use [Prettier](https://prettier.io/) for code formatting.

Before committing, please ensure your code passes linting, formatting, type-checking, and tests from the workspace root.

```bash
pnpm install
pnpm lint
pnpm format:check
pnpm type-check
pnpm test
```

### Pre-commit Hooks

We use `husky` and `lint-staged` to automatically lint and format staged files before commit.
We also provide a `.pre-commit-config.yaml` for users of the [pre-commit](https://pre-commit.com/) framework.

## Security & Public Repo Hygiene

- Never commit real credentials, bearer tokens, sync IDs, local machine paths, or client-specific configuration files.
- Keep local assistant and IDE state out of git. The repository ignores `.agent/`, `.cursor/`, and `.jules/`.
- Keep private financial data and reconciliation artifacts under `.local-reconciliation/` only.
- Treat `.actual-data/`, `.playwright-cli/`, and `tmp/` as local-only machine state, not project assets.
- Run the secret-scanning checks before pushing changes intended for public branches.

## Public Vs. Private Files

Use these rules when deciding where a file belongs:

- Put public code, tests, docs, and config in tracked paths like `mcp-server/`, `docs/`, `.github/`, and the repo root.
- Put bank exports, statement PDFs, budget backups, reconciliation CSVs, audit reports, and scratch analysis under `.local-reconciliation/`.
- Do not create new top-level folders for local financial work. Extend `.local-reconciliation/` instead so the public/private boundary stays obvious.

## Engineering Notes

Repository-level implementation notes are documented in [docs/engineering-notes.md](./docs/engineering-notes.md).

## Pull Request Process

1. Fork the repository and create your branch from `main`.
2. Ensure your code follows the coding standards.
3. Add tests for any new features or bug fixes.
4. Update documentation if necessary.
5. Submit a Pull Request.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
