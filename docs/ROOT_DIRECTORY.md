# Root Directory Structure

This document explains why certain files must remain in the root directory.

## Files That Must Stay at Root

These files are required by tools and frameworks at the project root:

### Configuration Files (Required by Tools)
- **`package.json`** - npm/Node.js requires this at root
- **`package-lock.json`** - npm lockfile, must be with package.json
- **`tsconfig.json`** - TypeScript compiler expects this at root
- **`tsconfig.build.json`** - Extends tsconfig.json, used by build script
- **`tsconfig.eslint.json`** - Extends tsconfig.json, used by ESLint
- **`eslint.config.ts`** - ESLint flat config format expects this at root
- **`vitest.config.ts`** - Vitest expects config at root
- **`railway.json`** - Railway deployment config (must be at root)
- **`Dockerfile`** - Docker build context expects this at root (used for releases)

### Dot Files (Tool Configuration)
- **`.gitignore`** - Git requires this at root
- **`.dockerignore`** - Docker build context requires this at root
- **`.nvmrc`** - Node Version Manager looks for this at root
- **`.prettierignore`** - Prettier ignore patterns (config is in `package.json`)
- **`.env.example`** - Standard location for environment variable examples

### Tool-Specific Directories
- **`.github/`** - GitHub Actions and templates (must be at root)
- **`.claude/`** - Claude IDE configuration (tool expects at root)
- **`.enforcer/`** - Code quality tooling (tool expects at root)
- **`.gemini/`** - Gemini CLI configuration (tool expects at root)

### Documentation
- **`README.md`** - Standard location, required by GitHub/npm

## Files That Can Be Organized

These have been moved to organized locations:

- **`CHANGELOG.md`** → `docs/CHANGELOG.md`
- **Docker dev files** → `dev/` folder
- **Documentation** → `docs/` folder
- **Source code** → `src/` folder
- **Project planning** → `PRPs/` folder

## Summary

While the root directory may seem cluttered, most files are required by development tools and cannot be moved without breaking functionality. The organization focuses on moving non-critical files (like CHANGELOG and dev tools) to appropriate subdirectories.

