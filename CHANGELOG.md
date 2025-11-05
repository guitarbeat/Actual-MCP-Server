# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Transaction deletion support via `manage-transaction` tool with `operation: 'delete'`
- `deleteTransaction` API wrapper function in `actual-api.ts` with automatic cache invalidation
- Delete operation validation and error handling in transaction management workflow
- Comprehensive confirmation messages for deleted transactions including transaction details when available
- `manage-account` tool for complete account lifecycle management (create, update, delete, close, reopen, balance)
- `updateTransaction` API wrapper function in `actual-api.ts` for consistency with other entity operations
- Account balance query operation via `manage-account` tool with `operation: 'balance'`
- Account close operation with automatic transfer support for non-zero balances
- Account reopen operation to restore closed accounts

### Changed
- `manage-transaction` tool now supports three operations: 'create', 'update', and 'delete'
- Transaction object is now optional in `manage-transaction` arguments (not required for delete operations)
- Tool schema updated to include delete operation with clear warnings about permanent deletion
- `manage-transaction` data-fetcher now uses `updateTransaction` API wrapper instead of direct API access
- Complete CRUD coverage achieved for all core entities (Accounts, Transactions, Categories, Category Groups, Payees, Rules, Schedules)

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
