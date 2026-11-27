/**
 * Session (de)serialization for JSON export / import and local save.
 * A session = { version, fileName, headers, rows, mapping, settings }.
 */
import { DEFAULT_SETTINGS } from './org.js';
import { FIELDS } from './csv.js';

export const SESSION_VERSION = 1;

export function makeSession({ fileName, headers, rows, mapping, settings }) {
  return { app: 'spanscope', version: SESSION_VERSION, savedAt: new Date().toISOString(), fileName, headers, rows, mapping, settings };
}

export function sanitizeSettings(s) {
  const out = { ...DEFAULT_SETTINGS };
  if (s && typeof s === 'object') {
    const n = Number(s.narrowBelow);
    const w = Number(s.wideAbove);
    if (Number.isFinite(n) && n >= 0 && n <= 1000) out.narrowBelow = Math.round(n);
    if (Number.isFinite(w) && w >= 0 && w <= 1000) out.wideAbove = Math.round(w);
    if (typeof s.countContractors === 'boolean') out.countContractors = s.countContractors;
  }
  return out;
}

/** Validate an imported JSON object. Returns { session } or { error }. */
export function parseSessionJson(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    return { error: 'That file is not valid JSON.' };
  }
  if (!obj || typeof obj !== 'object') return { error: 'Unexpected JSON structure.' };
  if (!Array.isArray(obj.rows) || !Array.isArray(obj.headers)) return { error: 'JSON is missing "rows" or "headers" arrays. Was it exported from Spanscope?' };
  const headers = obj.headers.map(String);
  const rows = obj.rows.filter((r) => r && typeof r === 'object' && !Array.isArray(r));
  const mapping = {};
  for (const f of FIELDS) {
    const col = obj.mapping && obj.mapping[f.key];
    mapping[f.key] = typeof col === 'string' && headers.includes(col) ? col : '';
  }
  return {
    session: {
      fileName: typeof obj.fileName === 'string' ? obj.fileName : 'imported.json',
      headers,
      rows,
      mapping,
      settings: sanitizeSettings(obj.settings)
    }
  };
}
