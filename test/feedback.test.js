import { describe, it, expect } from 'vitest';
import { buildIssueUrl, trimEnvironment, ISSUES_URL } from '../src/lib/feedback.js';

describe('feedback URL builder', () => {
  it('builds a bug report URL with template, title, version and environment', () => {
    const url = new URL(buildIssueUrl('bug', { version: '1.1.0', userAgent: 'Mozilla/5.0 (X11)  Test & Co' }));
    expect(url.origin + url.pathname).toBe(`${ISSUES_URL}/new`);
    expect(url.searchParams.get('template')).toBe('bug_report.yml');
    expect(url.searchParams.get('title')).toBe('[Bug]: ');
    expect(url.searchParams.get('version')).toBe('1.1.0');
    expect(url.searchParams.get('environment')).toBe('Mozilla/5.0 (X11) Test & Co');
  });

  it('builds a feature request URL without environment', () => {
    const url = new URL(buildIssueUrl('feature', { version: '1.1.0', userAgent: 'UA' }));
    expect(url.searchParams.get('template')).toBe('feature_request.yml');
    expect(url.searchParams.get('title')).toBe('[Feature]: ');
    expect(url.searchParams.has('environment')).toBe(false);
  });

  it('URL-encodes values and keeps URLs short', () => {
    const raw = buildIssueUrl('bug', { version: '1.1.0', userAgent: 'x'.repeat(1000) });
    expect(raw).not.toMatch(/[ []/);
    expect(raw.length).toBeLessThan(400);
    expect(trimEnvironment('a'.repeat(500)).length).toBe(160);
  });

  it('defaults the version from __APP_VERSION__', () => {
    const url = new URL(buildIssueUrl('feature'));
    expect(url.searchParams.get('version')).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('rejects unknown kinds', () => {
    expect(() => buildIssueUrl('spam')).toThrow();
  });
});
