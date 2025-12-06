# Requirements Document

## Introduction

This document specifies the requirements for adding dual transport support to the Actual Budget MCP server. The server currently supports HTTP+SSE transport for legacy MCP clients. This feature will add support for modern Streamable HTTP transport while maintaining backward compatibility with existing SSE clients. The implementation will use a unified approach with a single MCP server instance, multiple transport handlers, protocol detection, and shared authentication.

## Glossary

- **MCP Server**: The Model Context Protocol server that exposes Actual Budget functionality to AI assistants
- **Transport**: The communication mechanism used to exchange messages between MCP clients and servers
- **SSE Transport**: Server-Sent Events transport, a legacy MCP transport mechanism using HTTP+SSE
- **Streamable HTTP Transport**: Modern MCP transport mechanism using HTTP streaming
- **Protocol Detection**: Logic that determines which transport type a client is using based on request characteristics
- **Bearer Authentication**: HTTP authentication using Bearer tokens in the Authorization header
- **Transport Handler**: Code responsible for managing a specific transport type's connection lifecycle

## Requirements

### Requirement 1

**User Story:** As an MCP client developer, I want to connect using modern Streamable HTTP transport, so that I can benefit from improved performance and simpler connection management.

#### Acceptance Criteria

1. WHEN a client sends a POST request to the `/mcp` endpoint with MCP protocol messages THEN the MCP Server SHALL handle the request using Streamable HTTP transport
2. WHEN using Streamable HTTP transport THEN the MCP Server SHALL stream responses back to the client using HTTP chunked transfer encoding
3. WHEN a Streamable HTTP request completes THEN the MCP Server SHALL close the connection cleanly
4. WHEN a Streamable HTTP request is received THEN the MCP Server SHALL process all MCP protocol messages in the request body
5. WHEN errors occur during Streamable HTTP processing THEN the MCP Server SHALL return appropriate HTTP error status codes

### Requirement 2

**User Story:** As a legacy MCP client, I want to continue using HTTP+SSE transport, so that my existing integration continues to work without modifications.

#### Acceptance Criteria

1. WHEN a client sends a GET request to the `/sse` endpoint THEN the MCP Server SHALL establish an SSE connection
2. WHEN an SSE connection is established THEN the MCP Server SHALL accept POST requests to the `/messages` endpoint for that connection
3. WHEN the SSE connection closes THEN the MCP Server SHALL clean up the associated transport resources
4. WHEN using SSE transport THEN the MCP Server SHALL maintain the existing behavior for all MCP operations
5. WHEN both transports are available THEN the MCP Server SHALL handle SSE and Streamable HTTP clients simultaneously

### Requirement 3

**User Story:** As a system administrator, I want both transport types to use the same authentication mechanism, so that I can manage security consistently across all clients.

#### Acceptance Criteria

1. WHEN bearer authentication is enabled THEN the MCP Server SHALL require valid Bearer tokens for both SSE and Streamable HTTP endpoints
2. WHEN a request lacks a valid Bearer token and authentication is enabled THEN the MCP Server SHALL return HTTP 401 Unauthorized
3. WHEN bearer authentication is disabled THEN the MCP Server SHALL allow unauthenticated access to both transport endpoints
4. WHEN authentication fails THEN the MCP Server SHALL log the authentication failure with relevant details
5. WHEN the Bearer token is valid THEN the MCP Server SHALL process the request regardless of transport type

### Requirement 4

**User Story:** As a developer, I want the server to automatically detect which transport protocol a client is using, so that clients can connect to appropriate endpoints without manual configuration.

#### Acceptance Criteria

1. WHEN a GET request is received on `/sse` THEN the MCP Server SHALL route it to the SSE transport handler
2. WHEN a POST request is received on `/mcp` THEN the MCP Server SHALL route it to the Streamable HTTP transport handler
3. WHEN a POST request is received on `/messages` THEN the MCP Server SHALL route it to the SSE message handler
4. WHEN an unsupported HTTP method is used on a transport endpoint THEN the MCP Server SHALL return HTTP 405 Method Not Allowed
5. WHEN protocol detection succeeds THEN the MCP Server SHALL process the request with the appropriate transport handler

### Requirement 5

**User Story:** As a developer maintaining the MCP server, I want both transport types to share the same MCP server instance and tool registrations, so that I can avoid code duplication and maintain consistency.

#### Acceptance Criteria

1. WHEN the MCP Server starts THEN the system SHALL create a single MCP server instance with all tools registered
2. WHEN a transport handler is created THEN the system SHALL connect it to the shared MCP server instance
3. WHEN tools are registered THEN the system SHALL make them available to both SSE and Streamable HTTP clients
4. WHEN the server configuration changes THEN the system SHALL apply changes to both transport types
5. WHEN the server shuts down THEN the system SHALL clean up all transport handlers and the shared MCP server instance

### Requirement 6

**User Story:** As a system operator, I want the server to provide clear documentation about available endpoints, so that I can configure clients correctly and troubleshoot connection issues.

#### Acceptance Criteria

1. WHEN a GET request is made to the root path `/` THEN the MCP Server SHALL return an HTML page listing all available endpoints
2. WHEN the documentation page is displayed THEN the system SHALL show the SSE endpoint (`/sse` and `/messages`)
3. WHEN the documentation page is displayed THEN the system SHALL show the Streamable HTTP endpoint (`/mcp`)
4. WHEN bearer authentication is enabled THEN the documentation SHALL indicate that authentication is required
5. WHEN the documentation is accessed THEN the system SHALL include usage examples for both transport types

### Requirement 7

**User Story:** As a developer, I want comprehensive error handling for both transport types, so that clients receive clear error messages when issues occur.

#### Acceptance Criteria

1. WHEN a transport connection fails THEN the MCP Server SHALL log detailed error information
2. WHEN an invalid MCP message is received THEN the MCP Server SHALL return an error response in the appropriate format for the transport type
3. WHEN the Actual Budget API is unavailable THEN the MCP Server SHALL return HTTP 503 Service Unavailable
4. WHEN authentication fails THEN the MCP Server SHALL return HTTP 401 with a clear error message
5. WHEN an internal server error occurs THEN the MCP Server SHALL return HTTP 500 with error details logged

### Requirement 8

**User Story:** As a system administrator, I want the server to handle graceful shutdown for both transport types, so that in-flight requests complete properly during deployment or restart.

#### Acceptance Criteria

1. WHEN a shutdown signal is received THEN the MCP Server SHALL stop accepting new connections on all transport endpoints
2. WHEN shutdown begins THEN the MCP Server SHALL allow in-flight requests to complete within a timeout period
3. WHEN the shutdown timeout expires THEN the MCP Server SHALL force-close remaining connections
4. WHEN all connections are closed THEN the MCP Server SHALL shut down the Actual Budget API connection
5. WHEN shutdown completes THEN the MCP Server SHALL exit with an appropriate status code
