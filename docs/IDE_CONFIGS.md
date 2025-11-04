# IDE and Tool Configuration

This document describes the IDE and tool-specific configuration folders in this project.

## Configuration Folders

### `.github/`
- **Purpose**: GitHub Actions workflows and GitHub-specific configuration
- **Contents**: 
  - `workflows/` - CI/CD pipeline definitions
  - `copilot-instructions.md` - GitHub Copilot instructions for AI assistants
- **Location**: Must be at root (required by GitHub)

### `.claude/`
- **Purpose**: Claude IDE (Cursor) configuration
- **Contents**: 
  - `commands/` - Custom commands for PRP generation and execution
- **Location**: Must be at root (expected by Claude IDE)

### `.gemini/`
- **Purpose**: Gemini CLI configuration
- **Contents**: 
  - `settings.json` - MCP server configuration for Context7
- **Location**: Must be at root (expected by Gemini CLI)

### `.enforcer/`
- **Purpose**: Code quality enforcement tool configuration
- **Contents**: 
  - `config.json` - Agent Enforcer settings
- **Location**: Must be at root (expected by the tool)

## Why These Must Stay at Root

These folders use dot-prefixed names which is a convention for tool-specific configuration. Most tools that use these folders expect them at the project root and will not look in subdirectories.

## Configuration Files

- **Prettier**: Configuration is in `package.json` under the `"prettier"` field
- **ESLint**: Configuration is in `eslint.config.ts` at root
- **TypeScript**: Multiple configs (`tsconfig.json`, `tsconfig.build.json`, `tsconfig.eslint.json`) at root
- **Vitest**: Configuration is in `vitest.config.ts` at root

