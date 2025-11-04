#!/usr/bin/env node
/**
 * Test script for SSE endpoint and message routing
 * Tests the connection ID routing fix
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const EventSourceModule = require('eventsource');
const EventSource = EventSourceModule.EventSource || EventSourceModule.default?.EventSource || EventSourceModule;
const fetch = globalThis.fetch || (await import('node-fetch')).default;

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const BEARER_TOKEN = process.env.BEARER_TOKEN;
if (!BEARER_TOKEN) {
  console.error('Error: BEARER_TOKEN environment variable is required');
  process.exit(1);
}

let connectionId = null;
let testsPassed = 0;
let testsFailed = 0;

function log(message, type = 'info') {
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} ${message}`);
}

function test(name, fn) {
  try {
    fn();
    testsPassed++;
    log(`PASS: ${name}`, 'success');
  } catch (error) {
    testsFailed++;
    log(`FAIL: ${name} - ${error.message}`, 'error');
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

async function testSSEConnection() {
  log('Testing SSE connection...');
  
  return new Promise((resolve, reject) => {
    const url = `${SERVER_URL}/sse`;
    // EventSource from 'eventsource' package supports headers option
    const eventSource = new EventSource(url, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
      },
    });

    eventSource.addEventListener('connection', (event) => {
      try {
        const data = JSON.parse(event.data);
        connectionId = data.connectionId;
        test('SSE connection established', () => {
          if (!connectionId) {
            throw new Error('Connection ID not received');
          }
          log(`Connection ID: ${connectionId}`);
        });
        eventSource.close();
        resolve();
      } catch (error) {
        eventSource.close();
        reject(error);
      }
    });

    eventSource.addEventListener('error', (event) => {
      eventSource.close();
      // EventSource error event doesn't have status code in the event object
      // Check readyState to determine connection status
      if (eventSource.readyState === EventSource.CLOSED) {
        reject(new Error('SSE connection closed - check authentication and server status'));
      } else {
        reject(new Error('SSE connection error occurred'));
      }
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      eventSource.close();
      reject(new Error('SSE connection timeout'));
    }, 5000);
  });
}

async function testMessageRouting() {
  if (!connectionId) {
    throw new Error('No connection ID available for message routing test');
  }

  log('Testing message routing with connection ID...');

  const response = await fetch(`${SERVER_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BEARER_TOKEN}`,
      'X-MCP-Connection-ID': connectionId,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      },
      id: 1,
    }),
  });

  test('Message routing with connection ID', () => {
    if (response.status === 404) {
      throw new Error('Transport not found - connection ID routing failed');
    }
    if (response.status === 400) {
      throw new Error('Missing connection ID - header not sent correctly');
    }
    if (!response.ok) {
      throw new Error(`Unexpected status: ${response.status} ${response.statusText}`);
    }
  });

  return response;
}

async function testMessageRoutingWithoutID() {
  log('Testing message routing without connection ID (should fail)...');

  const response = await fetch(`${SERVER_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BEARER_TOKEN}`,
      // No X-MCP-Connection-ID header
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {},
      id: 2,
    }),
  });

  test('Message routing without connection ID should fail', () => {
    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }
  });

  return response;
}

async function testMessageRoutingWithInvalidID() {
  log('Testing message routing with invalid connection ID (should fail)...');

  const response = await fetch(`${SERVER_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BEARER_TOKEN}`,
      'X-MCP-Connection-ID': 'invalid-connection-id-12345',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {},
      id: 3,
    }),
  });

  test('Message routing with invalid connection ID should fail', () => {
    if (response.status !== 404) {
      throw new Error(`Expected 404, got ${response.status}`);
    }
  });

  return response;
}

async function testRootEndpoint() {
  log('Testing root endpoint...');

  const response = await fetch(`${SERVER_URL}/`, {
    headers: {
      'Authorization': `Bearer ${BEARER_TOKEN}`,
    },
  });

  test('Root endpoint accessible', () => {
    if (!response.ok) {
      throw new Error(`Root endpoint returned ${response.status}`);
    }
  });

  return response;
}

async function runTests() {
  log('Starting MCP SSE endpoint tests...');
  log(`Server URL: ${SERVER_URL}`);
  log('');

  try {
    // Test 1: Root endpoint
    await testRootEndpoint();

    // Test 2: SSE connection
    await testSSEConnection();

    // Test 3: Message routing with valid connection ID
    await testMessageRouting();

    // Test 4: Message routing without connection ID (should fail)
    await testMessageRoutingWithoutID();

    // Test 5: Message routing with invalid connection ID (should fail)
    await testMessageRoutingWithInvalidID();

    log('');
    log('Test Summary:', 'info');
    log(`✅ Passed: ${testsPassed}`, 'success');
    log(`❌ Failed: ${testsFailed}`, testsFailed > 0 ? 'error' : 'success');
    log('');

    if (testsFailed === 0) {
      log('All tests passed! 🎉', 'success');
      process.exit(0);
    } else {
      log('Some tests failed', 'error');
      process.exit(1);
    }
  } catch (error) {
    log(`Test execution error: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Check if required dependencies are available
try {
  // Try to import dynamically if available
  if (typeof EventSource === 'undefined') {
    log('EventSource not available. Install eventsource package: npm install eventsource', 'error');
    process.exit(1);
  }
} catch (error) {
  log('EventSource not available. Install eventsource package: npm install eventsource', 'error');
  process.exit(1);
}

runTests();

