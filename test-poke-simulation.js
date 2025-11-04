#!/usr/bin/env node
/**
 * Test that simulates Poke MCP behavior:
 * - One URL: /sse endpoint
 * - One Bearer token for authentication
 * - Connects to SSE, extracts connection ID, sends messages
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// eventsource is a CommonJS module that exports EventSource as a named export
const EventSourceModule = require('eventsource');
const EventSource = EventSourceModule.EventSource;
const fetch = globalThis.fetch || (await import('node-fetch')).default;

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const BEARER_TOKEN = process.env.BEARER_TOKEN || process.argv[2];
if (!BEARER_TOKEN) {
    console.error('Error: BEARER_TOKEN environment variable or argument is required');
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
    }
}

async function testSSEConnection() {
    log('Step 1: Connecting to SSE endpoint with Bearer token...');

    return new Promise((resolve, reject) => {
        const url = `${SERVER_URL}/sse`;
        // EventSource from 'eventsource' package supports headers option
        const eventSource = new EventSource(url, {
            headers: {
                'Authorization': `Bearer ${BEARER_TOKEN}`,
            },
        });
        let connectionEventReceived = false;

        eventSource.addEventListener('connection', (event) => {
            try {
                const data = JSON.parse(event.data);
                connectionId = data.connectionId;
                connectionEventReceived = true;

                test('SSE connection established and connection ID received', () => {
                    if (!connectionId) {
                        throw new Error('Connection ID not received');
                    }
                    log(`   Connection ID: ${connectionId}`);
                });

                eventSource.close();
                resolve(connectionId);
            } catch (error) {
                eventSource.close();
                reject(error);
            }
        });

        eventSource.addEventListener('message', (event) => {
            // Log MCP messages for debugging
            try {
                const data = JSON.parse(event.data);
                if (data.params && data.params.message) {
                    log(`   MCP message: ${data.params.message}`, 'info');
                }
            } catch (e) {
                // Ignore parse errors
            }
        });

        eventSource.addEventListener('error', (error) => {
            if (!connectionEventReceived) {
                eventSource.close();
                reject(new Error(`SSE connection error: ${error.message || 'Unknown error'}`));
            }
        });

        // Timeout after 10 seconds
        setTimeout(() => {
            if (!connectionEventReceived) {
                eventSource.close();
                reject(new Error('SSE connection timeout - no connection event received'));
            }
        }, 10000);
    });
}

async function testMessageRouting() {
    if (!connectionId) {
        throw new Error('No connection ID available for message routing test');
    }

    log('Step 2: Sending message to /messages endpoint with connection ID...');

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
                    name: 'poke-mcp-test',
                    version: '1.0.0',
                },
            },
            id: 1,
        }),
    });

    const status = response.status;
    const body = await response.json().catch(() => ({}));

    test('Message routing with connection ID', () => {
        if (status === 404) {
            throw new Error(`Transport not found - connection ID routing failed (connectionId: ${connectionId})`);
        }
        if (status === 400) {
            throw new Error(`Bad request - connection ID not recognized`);
        }
        if (!response.ok && status !== 200) {
            throw new Error(`Unexpected status: ${status} ${response.statusText}`);
        }
        if (body.result && body.result.protocolVersion) {
            log(`   Server protocol version: ${body.result.protocolVersion}`);
        }
    });

    return response;
}

async function testMessageWithoutConnectionID() {
    log('Step 3: Testing message without connection ID (should fail)...');

    const response = await fetch(`${SERVER_URL}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${BEARER_TOKEN}`,
            // Intentionally omitting X-MCP-Connection-ID header
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'initialize',
            params: {},
            id: 2,
        }),
    });

    const status = response.status;

    test('Message without connection ID correctly rejected', () => {
        if (status !== 400) {
            throw new Error(`Expected 400, got ${status}`);
        }
    });

    return response;
}

async function runTests() {
    log('🧪 Testing MCP Server (Poke MCP Simulation)');
    log(`Server URL: ${SERVER_URL}`);
    log(`Using Bearer token: ${BEARER_TOKEN.substring(0, 20)}...`);
    log('');

    try {
        // Test 1: SSE Connection
        await testSSEConnection();

        // Test 2: Message Routing with Connection ID
        await testMessageRouting();

        // Test 3: Message without Connection ID (should fail)
        await testMessageWithoutConnectionID();

        log('');
        log('Test Summary:', 'info');
        log(`✅ Passed: ${testsPassed}`, 'success');
        log(`❌ Failed: ${testsFailed}`, testsFailed > 0 ? 'error' : 'success');
        log('');

        if (testsFailed === 0) {
            log('All Poke MCP simulation tests passed! 🎉', 'success');
            log('');
            log('This confirms:');
            log('  1. SSE endpoint accepts Bearer token authentication');
            log('  2. Connection ID is sent in SSE event');
            log('  3. Messages are correctly routed using connection ID');
            log('  4. Requests without connection ID are properly rejected');
            return 0;
        } else {
            log('Some tests failed', 'error');
            return 1;
        }
    } catch (error) {
        testsFailed++;
        log(`Test execution error: ${error.message}`, 'error');
        return 1;
    }
}

// Run tests
const exitCode = await runTests();
process.exit(exitCode);

