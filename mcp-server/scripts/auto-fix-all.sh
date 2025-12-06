#!/bin/bash
# Advanced auto-fix script for TypeScript project
# Runs multiple auto-fix tools in sequence

set -e

echo "🔧 Running advanced auto-fixers..."

# 1. ESLint auto-fix (handles linting issues)
echo "📝 Running ESLint auto-fix..."
npm run lint:fix

# 2. Prettier formatting (ensures consistent code style)
echo "💅 Running Prettier formatting..."
npm run format

# 3. TypeScript type checking (doesn't auto-fix but validates)
echo "🔍 Running TypeScript type check..."
npm run type-check || echo "⚠️  TypeScript found type errors (not auto-fixable)"

# 4. Biome lint fixes (for Node.js import protocol and other fixes)
echo "🌿 Running Biome lint auto-fixes..."
npx --yes @biomejs/biome check --write --unsafe --formatter-enabled=false . || true

# 5. Restore Prettier formatting after Biome (Biome may change formatting)
echo "💅 Restoring Prettier formatting after Biome..."
npm run format

# 6. Final ESLint check
echo "📝 Final ESLint check..."
npm run lint:fix

echo "✅ Auto-fix complete!"
echo ""
echo "Note: Some issues may require manual fixes:"
echo "  - Complexity warnings"
echo "  - Function length warnings"
echo "  - Explicit 'any' types"
echo "  - Nested callback depth"
