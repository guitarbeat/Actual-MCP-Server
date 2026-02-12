import { describe, expect, it } from 'vitest';
import { renderEndpoint, renderStat } from './dashboard.js';

describe('dashboard utils', () => {
  describe('renderStat', () => {
    it('should escape HTML in label and value', () => {
      const result = renderStat('<script>', '&"');
      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('&amp;&quot;');
    });

    it('should render correctly with safe values', () => {
      const result = renderStat('Label', 'Value');
      expect(result).toContain('<dt class="label">Label</dt>');
      expect(result).toContain('<dd class="val">Value</dd>');
    });
  });

  describe('renderEndpoint', () => {
    it('should escape HTML in all fields', () => {
      const method = '<script>';
      const color = 'primary" style="bad';
      const path = '/path" onclick="alert(1)';
      const desc = '<b>bold</b>';

      const result = renderEndpoint(method, color, path, desc);

      // Method escaping
      expect(result).toContain('&lt;script&gt;');

      // Color escaping (prevents breaking out of class attribute)
      expect(result).toContain('text-primary&quot; style=&quot;bad');

      // Path escaping (prevents breaking out of data-path attribute)
      expect(result).toContain('data-path="/path&quot; onclick=&quot;alert(1)"');
      expect(result).toContain('aria-label="Copy /path&quot; onclick=&quot;alert(1) URL"');

      // Description escaping
      expect(result).toContain('&lt;b&gt;bold&lt;/b&gt;');
    });

    it('should render correctly with safe values', () => {
      const result = renderEndpoint('GET', 'success', '/api', 'Description');
      expect(result).toContain('<span class="method text-success">GET</span>');
      expect(result).toContain('<span class="path flex-none">/api</span>');
      expect(result).toContain('data-path="/api"');
      expect(result).toContain('<div class="flex-1"></div>');
      expect(result).toContain('<span class="desc">Description</span>');
    });
  });
});
