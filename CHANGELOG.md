# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed
- **BREAKING**: `manage-transaction` tool - Use `manage-entity` with `entityType: "transaction"` instead
- **BREAKING**: `manage-account` tool - Use `manage-entity` with `entityType: "account"` instead

### Changed
- Tool count reduced from 19 to 17 core tools (54% reduction from original 37 tools)
- All transaction and account operations now use the unified `manage-entity` tool

## [2.2.0] - Transaction & Account Tool Consolidation

### Added

## [1.0.0] - Initial Release

### Added
- Initial release of Actual Budget MCP Server
- 20 core tools for budget management
- Name resolution for accounts, categories, and payees
- Automatic budget loading on startup
- Persistent API connection for improved performance
- Intelligent caching system
- Performance monitoring and logging
- Support for Claude Desktop and other MCP clients
