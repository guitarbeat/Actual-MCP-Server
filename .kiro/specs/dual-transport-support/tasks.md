# Implementation Plan

- [x] 1. Research MCP SDK transport capabilities



  - Investigate if @modelcontextprotocol/sdk provides Streamable HTTP transport
  - Review SDK documentation for transport interfaces
  - Determine if custom transport implementation is needed
  - _Requirements: 1.1, 1.2_

- [ ] 2. Create transport manager module
  - [x] 2.1 Implement TransportManager interface


    - Create `src/core/transport/transport-manager.ts`
    - Define TransportConnection and TransportType types
    - Implement connection tracking and cleanup
    - _Requirements: 5.1, 5.2_
  
  - [x] 2.2 Write property test for transport manager



    - **Property 12: Transports share MCP server instance**
    - **Validates: Requirements 5.2**
  
  - [x] 2.3 Implement protocol detection logic


    - Create `src/core/transport/protocol-detector.ts`
    - Implement detectTransport() based on HTTP method and path
    - Implement validateRequest() for transport compatibility
    - _Requirements: 4.1, 4.2, 4.3, 4.5_
  
  - [x] 2.4 Write property test for protocol detection



    - **Property 10: Correct routing by method and path**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.5**

- [ ] 3. Implement Streamable HTTP transport handler
  - [x] 3.1 Create StreamableHTTPHandler class


    - Create `src/core/transport/streamable-http-handler.ts`
    - Implement handleRequest() method
    - Implement processMessages() for MCP message processing
    - Implement streamResponse() for chunked responses
    - Implement cleanup() for resource management
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 3.2 Write property test for chunked encoding



    - **Property 1: Streamable HTTP uses chunked transfer encoding**
    - **Validates: Requirements 1.2**
  
  - [x] 3.3 Write property test for message processing

    - **Property 2: All messages in request body are processed**
    - **Validates: Requirements 1.4**
  
  - [x] 3.4 Implement error handling for Streamable HTTP

    - Add error response formatting
    - Handle connection interruptions
    - Add detailed error logging
    - _Requirements: 1.5, 7.1, 7.2, 7.5_
  
  - [x] 3.5 Write property test for error status codes

    - **Property 3: Appropriate error status codes returned**
    - **Validates: Requirements 1.5, 7.2, 7.4, 7.5**

- [ ] 4. Add /mcp endpoint to Express server
  - [x] 4.1 Create POST /mcp route handler


    - Add route in `src/index.ts`
    - Apply bearerAuth middleware
    - Integrate with StreamableHTTPHandler
    - Add CORS support
    - _Requirements: 1.1, 3.1, 4.2_
  
  - [x] 4.2 Write property test for authentication

    - **Property 7: Authentication applies uniformly**
    - **Validates: Requirements 3.1, 3.2**
  
  - [x] 4.3 Write property test for invalid methods


    - **Property 11: Invalid methods rejected**
    - **Validates: Requirements 4.4**

- [ ] 5. Refactor existing SSE transport to use transport manager
  - [x] 5.1 Extract SSE handler logic

    - Create `src/core/transport/sse-handler.ts`
    - Move SSE connection logic from index.ts
    - Integrate with TransportManager
    - Maintain backward compatibility
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 5.2 Write property test for SSE message handling

    - **Property 4: SSE connections accept messages after establishment**
    - **Validates: Requirements 2.2**
  
  - [x] 5.3 Write property test for SSE cleanup

    - **Property 5: SSE transport cleanup on connection close**
    - **Validates: Requirements 2.3**

- [ ] 6. Implement concurrent transport support
  - [x] 6.1 Update server initialization

    - Ensure single MCP server instance is shared
    - Register tools/resources/prompts once
    - Connect both transport types to shared instance
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 6.2 Write property test for concurrent handling

    - **Property 6: Concurrent transport handling**
    - **Validates: Requirements 2.5**
  
  - [x] 6.3 Write property test for tool availability

    - **Property 13: Tools available across transports**
    - **Validates: Requirements 5.3**

- [ ] 7. Update authentication middleware
  - [x] 7.1 Ensure authentication works for all endpoints

    - Verify bearerAuth applies to /sse, /messages, /mcp
    - Test with valid and invalid tokens
    - Verify error responses are consistent
    - _Requirements: 3.1, 3.2, 3.3, 3.5_
  
  - [x] 7.2 Write property test for unauthenticated access

    - **Property 8: Unauthenticated access when disabled**
    - **Validates: Requirements 3.3**
  
  - [x] 7.3 Write property test for valid tokens

    - **Property 9: Valid tokens work across transports**
    - **Validates: Requirements 3.5**

- [ ] 8. Update documentation endpoint
  - [x] 8.1 Add Streamable HTTP endpoint to / page

    - Update HTML in GET / handler
    - Add /mcp endpoint documentation
    - Add usage examples for both transports
    - Include curl examples
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 9. Implement enhanced error handling
  - [x] 9.1 Add transport-specific error formatting

    - Implement error response builders for each transport
    - Ensure errors include appropriate details
    - Add error logging with context
    - _Requirements: 7.1, 7.2, 7.4, 7.5_
  
  - [x] 9.2 Write property test for connection failure logging

    - **Property 14: Connection failures logged**
    - **Validates: Requirements 7.1**

- [ ] 10. Update graceful shutdown logic
  - [x] 10.1 Enhance shutdown to handle both transports

    - Track active connections for both transport types
    - Stop accepting new connections on shutdown signal
    - Allow in-flight requests to complete
    - Force-close after timeout
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 10.2 Write property test for in-flight request completion

    - **Property 15: In-flight requests complete during shutdown**
    - **Validates: Requirements 8.2**

- [x] 11. Checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Update package.json and documentation
  - [x] 12.1 Add fast-check dependency

    - Add fast-check to devDependencies
    - Update test scripts if needed
    - _Requirements: All (testing infrastructure)_
  
  - [x] 12.2 Update README.md


    - Document both transport types
    - Add connection examples for each transport
    - Update architecture diagram
    - Add deployment notes
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [x] 13. Final Checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.
