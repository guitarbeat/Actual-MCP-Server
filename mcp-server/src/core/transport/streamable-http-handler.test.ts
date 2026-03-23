import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { IncomingMessage, ServerResponse } from 'node:http';
import { StreamableHTTPHandler } from './streamable-http-handler.js';

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
  })),
}));

describe('StreamableHTTPHandler Security', () => {
  let handler: StreamableHTTPHandler;
  let mockServer: Server;
  let req: IncomingMessage;
  let res: ServerResponse;

  beforeEach(() => {
    mockServer = new Server({ name: 'test', version: '1.0' }, { capabilities: {} });
    handler = new StreamableHTTPHandler(mockServer);

    req = {
      headers: {},
      method: 'POST',
    } as unknown as IncomingMessage;

    res = {
      headersSent: false,
      statusCode: 200,
      setHeader: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;
  });

  it('should sanitize error messages in 500 responses', async () => {
    // Mock handleNewSession to throw a sensitive error
    // We access the private method by casting to any
    vi.spyOn(
      handler as unknown as { handleNewSession: () => Promise<void> },
      'handleNewSession',
    ).mockRejectedValue(new Error('Sensitive database password exposed!'));

    // Trigger the error by simulating an initialize request
    const body = {
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0' },
      },
    };

    await handler.handleRequest(req, res, body);

    expect(res.statusCode).toBe(500);

    // The sensitive error message should NOT be included in the response
    expect(res.end).not.toHaveBeenCalledWith(
      expect.stringContaining('Sensitive database password exposed!'),
    );

    // The response should contain the generic error message
    expect(res.end).toHaveBeenCalledWith(expect.stringContaining('Internal server error'));
  });
});
