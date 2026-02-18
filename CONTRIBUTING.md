# Contributing to Actual Budget MCP & Utilities

Thank you for your interest in contributing! This document outlines the standards and process for contributing to this repository.

## Development Environment

This repository contains multiple projects. Each project is managed independently but shares some common tooling.

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** (for `mcp-server`)
- **npm** (for `statement-processor`)

## Code Standards

We adhere to strict coding standards to maintain quality and consistency.

### Linting & Formatting

- **Linting**: We use [ESLint](https://eslint.org/) with [Airbnb](https://github.com/airbnb/javascript) rules (TypeScript).
- **Formatting**: We use [Prettier](https://prettier.io/) for code formatting.

Before committing, please ensure your code passes linting and formatting checks.

**MCP Server:**
```bash
cd mcp-server
pnpm run lint
pnpm run format:check
pnpm run test
```

**Statement Processor:**
```bash
cd statement-processor
npm run lint
npm run format:check
npm run test
```

### Pre-commit Hooks

We use `husky` and `lint-staged` to automatically lint and format staged files before commit.
We also provide a `.pre-commit-config.yaml` for users of the [pre-commit](https://pre-commit.com/) framework.

## Pull Request Process

1. Fork the repository and create your branch from `main`.
2. Ensure your code follows the coding standards.
3. Add tests for any new features or bug fixes.
4. Update documentation if necessary.
5. Submit a Pull Request.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
