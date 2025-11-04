# Development Guide

This document provides information for developers working on the Actual Budget MCP Server.

**Last Updated:** January 2025  
**API Reference:** [Actual Budget API Documentation](https://actualbudget.org/docs/api/)

## Project Status

### Executive Summary

The Actual Budget MCP Server provides comprehensive access to Actual Budget functionality through the Model Context Protocol. The codebase follows TypeScript best practices with a modular architecture.

### Strengths

1. **Comprehensive API Coverage** (~99%): The server implements most of the Actual Budget API methods
2. **Well-Structured Architecture**: Clear separation of concerns:
   - Data fetching (`data-fetcher.ts`)
   - Input parsing (`input-parser.ts`)
   - Report generation (`report-generator.ts`)
   - Core utilities (`core/`)
3. **Proper Error Handling**: Consistent error handling patterns throughout
4. **Type Safety**: Strong TypeScript typing throughout
5. **Testing Infrastructure**: Vitest test framework with unit tests

## API Coverage

| Category | Status | Coverage |
|----------|--------|----------|
| Accounts | ✅ Complete | 100% |
| Categories | ✅ Complete | 100% |
| Category Groups | ✅ Complete | 100% |
| Payees | ✅ Complete | 100% |
| Rules | ✅ Complete | 100% |
| Transactions | ✅ Complete | 100% |
| Schedules | ✅ Complete | 100% |
| Budget Operations | ✅ Complete | 100% |
| Budget File Management | ⚠️ Partial | 90% (missing E2E password) |
| Utilities | ✅ Complete | 100% |

**Overall Coverage: ~99%**

## Resolved Issues

All critical API method signature issues have been resolved:
- ✅ Fixed `setBudgetCarryover` to include `month` parameter
- ✅ Fixed `holdBudgetForNextMonth` signature (month + amount)
- ✅ Fixed `resetBudgetHold` to take `month` instead of `categoryId`
- ✅ Implemented `getBudgetMonths()` and `getBudgetMonth(month)`
- ✅ Implemented `importTransactions()` for duplicate detection
- ✅ Implemented `runQuery()` for advanced queries
- ✅ Implemented `getServerVersion()`
- ✅ Updated `get-id-by-name` tool to use API's `getIDByName` method directly

## Outstanding Issues

### Missing End-to-End Encryption Support

**Location:** `src/actual-api.ts`

**Issue:** `downloadBudget` function doesn't support optional password parameter for E2E encrypted budgets.

**Fix Required:**
1. Update `downloadBudget` to accept optional password parameter
2. Update `download-budget` tool to accept optional password
3. Update `initActualApi()` to support `ACTUAL_BUDGET_PASSWORD` environment variable
4. Update README to document E2E encryption support

## Recommendations

### Short-term
- Add integration tests to verify API method signatures
- Document the connection lifecycle design decision
- Standardize comments to English (some Spanish comments present)

### Long-term
- Consider connection pooling/reuse if performance becomes an issue
- Add more comprehensive error messages for debugging
- Consider adding rate limiting for write operations

## Testing

### Recommended Test Areas
1. E2E Encryption: Test password flow if available
2. Budget Methods: Verify all budget manipulation methods
3. Connection Lifecycle: Verify repeated tool calls work efficiently
4. Security: Audit all logging to ensure no sensitive data exposure

## Code Quality

- ✅ No linter errors
- ✅ Consistent code style
- ✅ Good JSDoc comments where needed
- ✅ Proper TypeScript types
- ✅ Modular architecture

## Project Structure

### Root Directory Files

These files must stay at root because tools expect them there:

#### Configuration Files (Required by Tools)
- **`package.json`** - npm/Node.js requires this at root
- **`package-lock.json`** - npm lockfile, must be with package.json
- **`tsconfig.json`** - TypeScript compiler expects this at root
- **`tsconfig.build.json`** - Extends tsconfig.json, used by build script
- **`tsconfig.eslint.json`** - Extends tsconfig.json, used by ESLint
- **`eslint.config.ts`** - ESLint flat config format expects this at root
- **`vitest.config.ts`** - Vitest expects config at root
- **`railway.json`** - Railway deployment config (must be at root)
- **`Dockerfile`** - Docker build context expects this at root (used for releases)

#### Dot Files (Tool Configuration)
- **`.gitignore`** - Git requires this at root
- **`.dockerignore`** - Docker build context requires this at root
- **`.nvmrc`** - Node Version Manager looks for this at root
- **`.prettierignore`** - Prettier ignore patterns (config is in `package.json`)
- **`.env.example`** - Standard location for environment variable examples
- **`.nixpacks.toml`** - Nixpacks configuration for deployments

#### Tool-Specific Directories

These dot-prefixed folders must stay at root because tools expect them there:

- **`.github/`** - GitHub Actions workflows and GitHub-specific configuration
  - `workflows/` - CI/CD pipeline definitions
  - `copilot-instructions.md` - GitHub Copilot instructions
- **`.claude/`** - Claude IDE (Cursor) configuration
  - `commands/` - Custom commands for PRP generation
- **`.gemini/`** - Gemini CLI configuration
  - `settings.json` - MCP server configuration for Context7
- **`.enforcer/`** - Code quality enforcement tool configuration
  - `config.json` - Agent Enforcer settings

#### Documentation
- **`README.md`** - Standard location, required by GitHub/npm

### Organized Directories

These directories contain organized project files:

- **`docs/`** - All documentation
- **`src/`** - Source code
- **`dev/`** - Development tools (Docker, log server)
- **`PRPs/`** - Project planning documents

### Why This Structure?

The root directory structure follows Node.js/TypeScript best practices:

1. **Tool Requirements**: npm, TypeScript, ESLint, Vitest, Railway, Docker, and Git all expect their config files at the project root
2. **Industry Standards**: This structure follows standard Node.js/TypeScript conventions
3. **Tool Compatibility**: Moving any remaining files would break tool functionality

## Summary

While the root directory may seem cluttered, most files are required by development tools and cannot be moved without breaking functionality. The organization focuses on moving non-critical files to appropriate subdirectories while keeping essential tool configuration files at root.

