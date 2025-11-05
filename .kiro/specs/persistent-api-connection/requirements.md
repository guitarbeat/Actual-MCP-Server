# Requirements Document

## Introduction

This document outlines the requirements for implementing persistent API connections in the Actual Budget MCP Server. Currently, the server initializes and shuts down the Actual Budget API connection for every tool call and resource request, causing significant performance overhead. This feature will maintain a persistent connection throughout the server's lifetime, dramatically improving response times for consecutive operations.

## Glossary

- **MCP Server**: The Model Context Protocol server that exposes Actual Budget functionality to LLM assistants
- **Actual Budget API**: The underlying API from `@actual-app/api` that connects to Actual Budget data
- **API Connection**: The initialized state of the Actual Budget API, including server connection and loaded budget
- **Tool Call**: An MCP tool invocation (e.g., get-transactions, create-account)
- **Resource Request**: An MCP resource request (e.g., listing accounts, reading transactions)
- **SSE Session**: A Server-Sent Events session representing a single client connection
- **Connection Lifecycle**: The period from server startup to shutdown during which the API connection should remain active
- **Initialization Overhead**: The time and resources required to connect to Actual Budget and download the budget file

## Requirements

### Requirement 1: Persistent API Connection

**User Story:** As an LLM assistant user, I want consecutive tool calls to execute quickly, so that I can interact with my budget data efficiently without waiting for repeated initialization.

#### Acceptance Criteria

1. WHEN THE MCP Server starts, THE MCP Server SHALL initialize the Actual Budget API connection once
2. WHILE THE MCP Server is running, THE MCP Server SHALL maintain the Actual Budget API connection across all tool calls and resource requests
3. WHEN a tool call completes, THE MCP Server SHALL NOT shut down the Actual Budget API connection
4. WHEN a resource request completes, THE MCP Server SHALL NOT shut down the Actual Budget API connection
5. WHEN THE MCP Server receives a shutdown signal (SIGINT, SIGTERM), THE MCP Server SHALL gracefully shut down the Actual Budget API connection

### Requirement 2: Connection Initialization

**User Story:** As a system administrator, I want the server to initialize the API connection at startup and fail fast if connection cannot be established, so that I can identify configuration issues immediately.

#### Acceptance Criteria

1. WHEN THE MCP Server starts, THE MCP Server SHALL attempt to initialize the Actual Budget API connection before accepting requests
2. IF the Actual Budget API connection fails to initialize, THEN THE MCP Server SHALL log a detailed error message and exit with a non-zero status code
3. WHEN THE MCP Server is in test mode (--test-resources or --test-custom), THE MCP Server SHALL shut down the API connection after test completion
4. WHILE THE MCP Server is initializing, THE MCP Server SHALL log connection progress including data directory, server URL, and budget selection

### Requirement 3: Connection State Management

**User Story:** As a developer, I want the API connection state to be managed safely with proper guards, so that concurrent requests don't cause race conditions or connection issues.

#### Acceptance Criteria

1. WHEN multiple tool calls execute concurrently, THE MCP Server SHALL safely share the single API connection without race conditions
2. IF the API connection is lost during operation, THEN THE MCP Server SHALL log an error and attempt to reconnect on the next request
3. WHEN a tool call or resource request executes, THE MCP Server SHALL verify the API connection is initialized before proceeding
4. IF the API connection is not initialized when a request arrives, THEN THE MCP Server SHALL initialize it before processing the request

### Requirement 4: Performance Improvement

**User Story:** As an LLM assistant user, I want tool calls to execute at least 50% faster when the API is already initialized, so that my workflow is more responsive.

#### Acceptance Criteria

1. WHEN executing consecutive tool calls with a persistent connection, THE MCP Server SHALL complete requests at least 50% faster than with per-request initialization
2. WHEN the API connection is already initialized, THE MCP Server SHALL skip initialization overhead (server connection, budget download)
3. WHILE processing requests, THE MCP Server SHALL log performance metrics showing initialization time savings
4. WHEN comparing performance before and after this change, THE MCP Server SHALL demonstrate measurable improvement in multi-request scenarios

### Requirement 5: Backward Compatibility

**User Story:** As a developer, I want existing tool implementations to work without modification, so that this change doesn't break existing functionality.

#### Acceptance Criteria

1. WHEN a tool calls an API wrapper function (e.g., getAccounts, createCategory), THE API wrapper function SHALL ensure the connection is initialized
2. WHEN existing tests run, THE tests SHALL pass without modification to test logic
3. WHEN the server operates in SSE mode or stdio mode, THE MCP Server SHALL maintain persistent connections in both modes
4. IF bearer authentication is enabled, THE MCP Server SHALL maintain persistent connections with authentication

### Requirement 6: Error Handling and Recovery

**User Story:** As a system administrator, I want the server to handle connection errors gracefully and provide clear diagnostics, so that I can troubleshoot issues effectively.

#### Acceptance Criteria

1. IF the API connection fails during a request, THEN THE MCP Server SHALL return a clear error message to the client
2. WHEN a connection error occurs, THE MCP Server SHALL log the error with full context (operation, parameters, stack trace)
3. IF the API connection becomes stale or corrupted, THEN THE MCP Server SHALL detect this and attempt reconnection
4. WHEN reconnection is attempted, THE MCP Server SHALL log the reconnection attempt and outcome

### Requirement 7: Resource Cleanup

**User Story:** As a system administrator, I want the server to clean up resources properly on shutdown, so that no connections or file handles are left open.

#### Acceptance Criteria

1. WHEN THE MCP Server receives SIGINT, THE MCP Server SHALL shut down the Actual Budget API connection before exiting
2. WHEN THE MCP Server receives SIGTERM, THE MCP Server SHALL shut down the Actual Budget API connection before exiting
3. WHEN THE MCP Server shuts down, THE MCP Server SHALL log performance summaries and cache statistics before cleanup
4. IF shutdown takes longer than 5 seconds, THEN THE MCP Server SHALL force exit to prevent hanging

### Requirement 8: Testing and Validation

**User Story:** As a developer, I want comprehensive tests to verify persistent connections work correctly, so that I can be confident the implementation is robust.

#### Acceptance Criteria

1. WHEN running unit tests, THE test suite SHALL verify that shutdownActualApi is not called after tool execution
2. WHEN running integration tests, THE test suite SHALL verify that multiple consecutive tool calls share the same API connection
3. WHEN running performance tests, THE test suite SHALL measure and validate the performance improvement
4. WHEN running error scenario tests, THE test suite SHALL verify proper error handling and recovery
