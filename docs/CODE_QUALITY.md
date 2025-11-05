# Code Quality Metrics

This document describes the code quality tools and metrics used in the Actual Budget MCP Server project.

## Overview

The project uses several tools to maintain high code quality:

1. **Code Duplication Detection** - jscpd
2. **Complexity Analysis** - ESLint complexity rules
3. **Pre-commit Hooks** - Husky + lint-staged

## Code Duplication Detection

### Tool: jscpd

We use [jscpd](https://github.com/kucherenko/jscpd) to detect code duplication across the codebase.

### Configuration

Configuration is stored in `.jscpd.json`:

- **Threshold**: 5% - Maximum allowed duplication percentage
- **Min Lines**: 5 - Minimum lines to consider as duplication
- **Min Tokens**: 50 - Minimum tokens to consider as duplication
- **Formats**: TypeScript and JavaScript files
- **Ignored**: Tests, build artifacts, node_modules

### Running Duplication Detection

```bash
# Quick check (console output only)
npm run duplication

# Full report with HTML output
npm run duplication:report
```

### Reports

HTML reports are generated in `./coverage/jscpd/` directory. Open `index.html` to view detailed duplication analysis.

### Interpreting Results

- **< 5%**: Excellent - minimal duplication
- **5-10%**: Good - acceptable duplication
- **10-15%**: Warning - consider refactoring
- **> 15%**: Critical - refactoring needed

## Complexity Analysis

### Tool: ESLint

We use ESLint's built-in complexity rules to monitor code complexity.

### Rules

The following complexity rules are enforced:

#### Cyclomatic Complexity
```javascript
'complexity': ['warn', { max: 15 }]
```
- Measures the number of linearly independent paths through code
- **Max**: 15 paths
- **Level**: Warning

#### Max Depth
```javascript
'max-depth': ['warn', { max: 4 }]
```
- Limits nesting depth of blocks
- **Max**: 4 levels
- **Level**: Warning

#### Max Lines Per Function
```javascript
'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }]
```
- Limits function length
- **Max**: 100 lines (excluding blanks and comments)
- **Level**: Warning

#### Max Nested Callbacks
```javascript
'max-nested-callbacks': ['warn', { max: 3 }]
```
- Limits callback nesting
- **Max**: 3 levels
- **Level**: Warning

#### Max Parameters
```javascript
'max-params': ['warn', { max: 5 }]
```
- Limits function parameters
- **Max**: 5 parameters
- **Level**: Warning

### Running Complexity Analysis

```bash
# Run ESLint (includes complexity checks)
npm run lint

# Auto-fix issues where possible
npm run lint:fix
```

### Addressing Complexity Warnings

When you encounter complexity warnings:

1. **Extract Functions**: Break down complex functions into smaller ones
2. **Use Early Returns**: Reduce nesting with guard clauses
3. **Simplify Conditionals**: Use lookup tables or strategy patterns
4. **Reduce Parameters**: Use options objects for functions with many parameters

## Pre-commit Hooks

### Tool: Husky + lint-staged

We use Husky to run quality checks before each commit.

### What Gets Checked

On every commit, the following checks run automatically on staged files:

1. **TypeScript/JavaScript files** (`.ts`, `.js`):
   - ESLint with auto-fix
   - Prettier formatting

2. **JSON/Markdown files** (`.json`, `.md`):
   - Prettier formatting

### Configuration

Configuration is in `package.json`:

```json
"lint-staged": {
  "*.{ts,js}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md}": [
    "prettier --write"
  ]
}
```

### Bypassing Hooks (Not Recommended)

In rare cases where you need to bypass pre-commit hooks:

```bash
git commit --no-verify -m "Your message"
```

**Note**: Only use this for emergency fixes. All code should pass quality checks.

## Comprehensive Quality Check

### Running All Metrics

```bash
# Run all quality checks
npm run metrics

# Or run individual checks
npm run quality          # Lint + format + type-check
npm run duplication      # Code duplication
npm run test:coverage    # Test coverage
```

### Quality Gates

Before merging code, ensure:

- ✅ All tests pass (`npm test`)
- ✅ No ESLint errors (`npm run lint`)
- ✅ Code is formatted (`npm run format:check`)
- ✅ No TypeScript errors (`npm run type-check`)
- ✅ Code duplication < 5% (`npm run duplication`)
- ✅ Test coverage > 85% (`npm run test:coverage`)

## Continuous Integration

These checks should also run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Quality Checks
  run: |
    npm run quality
    npm run duplication
    npm run test:coverage
```

## Best Practices

### Writing Maintainable Code

1. **Keep Functions Small**: Aim for < 50 lines per function
2. **Limit Complexity**: Keep cyclomatic complexity < 10
3. **Avoid Deep Nesting**: Use early returns and guard clauses
4. **Extract Common Logic**: DRY (Don't Repeat Yourself)
5. **Use Descriptive Names**: Make code self-documenting

### Refactoring High Complexity

When you encounter high complexity:

```typescript
// ❌ High complexity (nested conditions)
function processTransaction(transaction: Transaction): Result {
  if (transaction.amount > 0) {
    if (transaction.category) {
      if (transaction.account) {
        if (transaction.date) {
          // ... complex logic
        }
      }
    }
  }
}

// ✅ Lower complexity (early returns)
function processTransaction(transaction: Transaction): Result {
  if (transaction.amount <= 0) {
    return error('Invalid amount');
  }
  if (!transaction.category) {
    return error('Missing category');
  }
  if (!transaction.account) {
    return error('Missing account');
  }
  if (!transaction.date) {
    return error('Missing date');
  }
  
  // ... simple logic
}
```

### Reducing Duplication

When you find duplicated code:

```typescript
// ❌ Duplicated validation logic
function validateAccount(account: Account): boolean {
  if (!account.id || !account.name) return false;
  return true;
}

function validateCategory(category: Category): boolean {
  if (!category.id || !category.name) return false;
  return true;
}

// ✅ Extracted common validation
function validateEntity(entity: { id?: string; name?: string }): boolean {
  return Boolean(entity.id && entity.name);
}
```

## Troubleshooting

### Pre-commit Hook Not Running

```bash
# Reinstall husky
npm run prepare
chmod +x .husky/pre-commit
```

### jscpd Not Found

```bash
# Reinstall dependencies
npm install
```

### ESLint Complexity Warnings

Review the specific warning and refactor the code to reduce complexity. See "Addressing Complexity Warnings" above.

## Resources

- [jscpd Documentation](https://github.com/kucherenko/jscpd)
- [ESLint Complexity Rules](https://eslint.org/docs/latest/rules/complexity)
- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/okonet/lint-staged)

## Metrics Dashboard

After running `npm run metrics`, you can view:

- **Duplication Report**: `./coverage/jscpd/index.html`
- **Test Coverage**: `./coverage/index.html`
- **Console Output**: Summary of all metrics

## Maintenance

### Updating Thresholds

As the codebase improves, consider tightening thresholds:

1. **Duplication**: Lower from 5% to 3%
2. **Complexity**: Lower from 15 to 10
3. **Function Length**: Lower from 100 to 75 lines

Update `.jscpd.json` and `eslint.config.ts` accordingly.

### Regular Reviews

Schedule regular code quality reviews:

- **Weekly**: Check duplication trends
- **Monthly**: Review complexity hotspots
- **Quarterly**: Update quality standards

## Summary

Code quality metrics help maintain a healthy codebase by:

- Preventing code duplication
- Limiting complexity
- Enforcing standards automatically
- Providing actionable feedback

Run `npm run metrics` regularly to monitor code quality!
