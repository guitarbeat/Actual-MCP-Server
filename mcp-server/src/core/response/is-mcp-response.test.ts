import { describe, expect, it } from 'vitest';
import { isMCPResponse } from './is-mcp-response.js';
import type { MCPResponse } from './types.js';

describe('isMCPResponse', () => {
  it('should return true for a valid MCP response with empty content', () => {
    const validResponse: MCPResponse = {
      content: [],
    };
    expect(isMCPResponse(validResponse)).toBe(true);
  });

  it('should return true for a valid MCP response with text content', () => {
    const validResponse: MCPResponse = {
      content: [{ type: 'text', text: 'Hello' }],
    };
    expect(isMCPResponse(validResponse)).toBe(true);
  });

  it('should return true for a valid MCP response with extra properties', () => {
    const validResponse = {
      content: [],
      isError: true,
      extraProp: 'value',
    };
    expect(isMCPResponse(validResponse)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isMCPResponse(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isMCPResponse(undefined)).toBe(false);
  });

  it('should return false for primitive values', () => {
    expect(isMCPResponse('string')).toBe(false);
    expect(isMCPResponse(123)).toBe(false);
    expect(isMCPResponse(true)).toBe(false);
    expect(isMCPResponse(false)).toBe(false);
  });

  it('should return false for an object missing the content property', () => {
    const invalidResponse = {
      isError: true,
    };
    expect(isMCPResponse(invalidResponse)).toBe(false);
  });

  it('should return false for an object where content is not an array', () => {
    expect(isMCPResponse({ content: 'string' })).toBe(false);
    expect(isMCPResponse({ content: {} })).toBe(false);
    expect(isMCPResponse({ content: null })).toBe(false);
    expect(isMCPResponse({ content: undefined })).toBe(false);
    expect(isMCPResponse({ content: 123 })).toBe(false);
    expect(isMCPResponse({ content: true })).toBe(false);
  });

  it('should return false for arrays (not objects with a content property)', () => {
    expect(isMCPResponse([])).toBe(false);
    expect(isMCPResponse([{ content: [] }])).toBe(false);
  });
});
