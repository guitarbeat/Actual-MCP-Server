# Advanced Auto-Fix Tools

This document describes the advanced auto-fix tools available for this TypeScript project.

## Available Tools

### 1. **ESLint** (`npm run lint:fix`)

- **Purpose**: Linting and code quality checks
- **Auto-fixes**:
  - Code style issues
  - TypeScript-specific linting rules
  - Unused variables (with proper configuration)
  - Import organization (when configured)
- **Limitations**: Cannot fix complexity, function length, or explicit `any` types (requires manual refactoring)

### 2. **Prettier** (`npm run format`)

- **Purpose**: Code formatting
- **Auto-fixes**:
  - Indentation
  - Quote style
  - Semicolons
  - Trailing commas
  - Line breaks
  - Spacing
- **Configuration**: Defined in `package.json`

### 3. **Biome** (`npx @biomejs/biome check --write --unsafe`)

- **Purpose**: Modern linter/formatter (alternative to ESLint/Prettier)
- **Auto-fixes**:
  - Node.js import protocol (`node:fs` instead of `fs`)
  - Import sorting
  - Code style issues
  - Some linting rules
- **Note**: May conflict with Prettier formatting. Use with `--formatter-enabled=false` to only apply lint fixes.

### 4. **TypeScript Compiler** (`npm run type-check`)

- **Purpose**: Type checking
- **Auto-fixes**: None (only reports errors)
- **Usage**: Validates types but doesn't auto-fix

### 5. **ts-prune** (`npx ts-prune`)

- **Purpose**: Find unused exports
- **Auto-fixes**: None (only reports)
- **Usage**: Helps identify dead code

### 6. **depcheck** (`npx depcheck`)

- **Purpose**: Find unused dependencies
- **Auto-fixes**: None (only reports)
- **Usage**: Helps clean up `package.json`

## Recommended Workflow

### Quick Auto-Fix

```bash
npm run auto-fix
```

This runs all auto-fix tools in sequence:

1. ESLint auto-fix
2. Prettier formatting
3. TypeScript type check (validation only)
4. Biome lint fixes (without formatting)
5. Prettier formatting (to restore after Biome)
6. Final ESLint check

### Individual Tools

```bash
# ESLint only
npm run lint:fix

# Prettier only
npm run format

# Type check only
npm run type-check

# Biome lint fixes only (no formatting)
npx @biomejs/biome check --write --unsafe --formatter-enabled=false .
```

## What Gets Auto-Fixed

✅ **Automatically Fixed:**

- Code formatting (indentation, spacing, quotes)
- Import organization (when configured)
- Node.js import protocol (`node:` prefix)
- Simple linting violations
- TypeScript inferrable types (when rule enabled)

❌ **Requires Manual Fix:**

- Code complexity (function complexity > 15)
- Function length (> 100 lines)
- Explicit `any` types
- Nested callback depth (> 3 levels)
- Unused exports (requires manual removal)
- Unused dependencies (requires manual removal)

## Integration

The `auto-fix` script is integrated into the project workflow:

- Can be run manually: `npm run auto-fix`
- Integrated with `lint-staged` for pre-commit hooks
- Part of CI/CD quality checks

## Notes

- Biome and Prettier may conflict on formatting. The auto-fix script runs Prettier after Biome to ensure consistent formatting.
- Some warnings (complexity, function length) are informational and don't block execution but indicate areas for refactoring.
- TypeScript type errors must be fixed manually as the compiler doesn't auto-fix.
