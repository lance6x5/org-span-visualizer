/**
 * In-app feedback: builds pre-filled GitHub "new issue" URLs.
 * No tokens and no API calls. The app only opens a link in a new tab and the
 * user submits the issue with their own GitHub account. Only the app version
 * and a trimmed browser string go into the URL, never any roster data.
 */

export const REPO_URL = 'https://github.com/lance6x5/org-span-visualizer';
export const ISSUES_URL = `${REPO_URL}/issues`;

/* global __APP_VERSION__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

const MAX_ENV = 160;

const KINDS = {
  bug: { template: 'bug_report.yml', title: '[Bug]: ', withEnv: true },
  feature: { template: 'feature_request.yml', title: '[Feature]: ', withEnv: false }
};

/** Collapse whitespace and cap length so URLs stay short. */
export function trimEnvironment(ua) {
  const s = String(ua || '').replace(/\s+/g, ' ').trim();
  return s.length > MAX_ENV ? `${s.slice(0, MAX_ENV - 1)}…` : s;
}

/**
 * @param {'bug'|'feature'} kind
 * @param {{ version?: string, userAgent?: string }} [opts]
 */
export function buildIssueUrl(kind, { version = APP_VERSION, userAgent } = {}) {
  const k = KINDS[kind];
  if (!k) throw new Error(`Unknown feedback kind: ${kind}`);
  const params = new URLSearchParams();
  params.set('template', k.template);
  params.set('title', k.title);
  params.set('version', String(version));
  if (k.withEnv) {
    const ua = userAgent !== undefined ? userAgent : typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const env = trimEnvironment(ua);
    if (env) params.set('environment', env);
  }
  // URLSearchParams encodes spaces as "+", which GitHub decodes correctly; use
  // %20 anyway for maximum compatibility.
  return `${ISSUES_URL}/new?${params.toString().replace(/\+/g, '%20')}`;
}
