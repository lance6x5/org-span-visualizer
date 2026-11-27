import { describe, it, expect } from 'vitest';
import { analyzeRoster, validateAndLink, normalizeRows, buildTree, computeAnalytics, median, pathTo, isContractor, VIRTUAL_ROOT_ID, DEFAULT_SETTINGS } from '../src/lib/org.js';
import { parseCsvText, guessMapping, missingRequired, flaggedToDelimited } from '../src/lib/csv.js';
import { parseSessionJson, sanitizeSettings } from '../src/lib/session.js';
import { SAMPLE_CSV } from '../src/lib/sample.js';

const MAP = { employee_id: 'id', name: 'name', title: 'title', manager_id: 'mgr', employment_type: 'type' };
const row = (id, mgr = '', type = 'FTE') => ({ id, name: `N${id}`, title: 'T', mgr, type });

describe('validation', () => {
  it('reports duplicate ids and keeps the first', () => {
    const { people, issues } = validateAndLink(normalizeRows([row('1'), row('2', '1'), row('2', '1')], MAP));
    expect(people.size).toBe(2);
    expect(issues.some((i) => i.type === 'duplicate_id')).toBe(true);
  });

  it('reports missing managers and multiple roots', () => {
    const { roots, issues } = validateAndLink(normalizeRows([row('1'), row('2', '99')], MAP));
    expect(roots.sort()).toEqual(['1', '2']);
    expect(issues.map((i) => i.type)).toEqual(expect.arrayContaining(['missing_manager', 'multiple_roots']));
  });

  it('detects and breaks circular chains without hanging', () => {
    const rows = [row('1'), row('A', 'C'), row('B', 'A'), row('C', 'B')];
    const { roots, issues } = validateAndLink(normalizeRows(rows, MAP));
    const cyc = issues.find((i) => i.type === 'cycle');
    expect(cyc).toBeTruthy();
    expect(cyc.ids.sort()).toEqual(['A', 'B', 'C']);
    expect(roots).toContain('A');
  });

  it('handles self-managed rows and blank ids', () => {
    const { issues } = validateAndLink(normalizeRows([row('1', '1'), row('')], MAP));
    expect(issues.map((i) => i.type)).toEqual(expect.arrayContaining(['cycle', 'missing_id']));
  });

  it('wraps multiple roots in a virtual node', () => {
    const { tree, analytics } = analyzeRoster([row('1'), row('2')], MAP);
    expect(tree.id).toBe(VIRTUAL_ROOT_ID);
    expect(analytics.headcount).toBe(2);
    expect(analytics.layers).toBe(1);
  });
});

describe('spans and analytics', () => {
  const rows = [row('1'), row('2', '1'), row('3', '1'), row('4', '1', 'Contractor'), row('5', '2')];

  it('computes direct and total org sizes', () => {
    const { tree } = analyzeRoster(rows, MAP);
    expect(tree.directCount).toBe(3);
    expect(tree.totalOrg).toBe(4);
    expect(tree.children.find((c) => c.id === '2').totalOrg).toBe(1);
  });

  it('flags narrow managers and respects contractor exclusion', () => {
    const s = { narrowBelow: 3, wideAbove: 10, countContractors: true };
    expect(analyzeRoster(rows, MAP, s).tree.status).toBe('healthy');
    const ex = analyzeRoster(rows, MAP, { ...s, countContractors: false });
    expect(ex.tree.countedSpan).toBe(2);
    expect(ex.tree.status).toBe('narrow');
  });

  it('flags wide managers', () => {
    const many = [row('1'), ...Array.from({ length: 12 }, (_, i) => row(`c${i}`, '1'))];
    const { tree, analytics } = analyzeRoster(many, MAP);
    expect(tree.status).toBe('wide');
    expect(analytics.flagged[0].id).toBe('1');
  });

  it('median works for odd and even lengths', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBe(0);
  });

  it('pathTo returns ancestors', () => {
    const { tree } = analyzeRoster(rows, MAP);
    expect(pathTo(tree, '5')).toEqual(['1', '2', '5']);
  });

  it('detects contractors', () => {
    expect(isContractor('Contractor')).toBe(true);
    expect(isContractor('FTE')).toBe(false);
    expect(isContractor('')).toBe(false);
  });
});

describe('sample CSV', () => {
  it('has 40 people and expected flags', () => {
    const { headers, rows } = parseCsvText(SAMPLE_CSV);
    const mapping = guessMapping(headers);
    expect(missingRequired(mapping)).toEqual([]);
    const { analytics, issues } = analyzeRoster(rows, mapping, DEFAULT_SETTINGS);
    expect(analytics.headcount).toBe(40);
    expect(issues).toEqual([]);
    expect(analytics.layers).toBe(4);
    const flaggedIds = analytics.flagged.map((m) => m.id);
    expect(flaggedIds).toEqual(expect.arrayContaining(['E002', 'E003', 'E004']));
    // Excluding contractors brings the CTO back into the healthy band (10)
    const ex = analyzeRoster(rows, mapping, { ...DEFAULT_SETTINGS, countContractors: false });
    expect(ex.analytics.flagged.map((m) => m.id)).not.toContain('E002');
  });
});

describe('csv helpers', () => {
  it('guesses mappings from varied header names', () => {
    const m = guessMapping(['Emp ID', 'Full Name', 'Job Title', 'Reports To', 'Dept', 'Office', 'Worker Type']);
    expect(m).toMatchObject({ employee_id: 'Emp ID', name: 'Full Name', title: 'Job Title', manager_id: 'Reports To', department: 'Dept', location: 'Office', employment_type: 'Worker Type' });
  });

  it('exports flagged managers as CSV and TSV', () => {
    const many = [row('1'), ...Array.from({ length: 12 }, (_, i) => row(`c${i}`, '1'))];
    const { analytics } = analyzeRoster(many, MAP);
    const csv = flaggedToDelimited(analytics.flagged, ',');
    const tsv = flaggedToDelimited(analytics.flagged, '\t');
    expect(csv.split('\r\n')[0]).toContain('employee_id,name');
    expect(tsv.split('\r\n')[0]).toContain('employee_id\tname');
    expect(csv).toContain('too wide');
  });

  it('does not throw on garbage input', () => {
    const r = parseCsvText('\u0000\u0001,,,\n"unterminated');
    expect(Array.isArray(r.rows)).toBe(true);
  });
});

describe('session import', () => {
  it('rejects invalid JSON', () => {
    expect(parseSessionJson('nope').error).toBeTruthy();
    expect(parseSessionJson('{"a":1}').error).toBeTruthy();
  });
  it('sanitizes settings and mapping', () => {
    const { session } = parseSessionJson(JSON.stringify({ headers: ['id'], rows: [{ id: '1' }], mapping: { employee_id: 'id', name: 'bogus' }, settings: { narrowBelow: 'x', wideAbove: 7 } }));
    expect(session.mapping.employee_id).toBe('id');
    expect(session.mapping.name).toBe('');
    expect(session.settings).toEqual({ ...DEFAULT_SETTINGS, wideAbove: 7 });
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('buildTree/computeAnalytics on large input', () => {
  it('handles a deep chain without stack issues at moderate depth', () => {
    const rows = [row('0'), ...Array.from({ length: 2000 }, (_, i) => row(String(i + 1), String(i)))];
    const linked = validateAndLink(normalizeRows(rows, MAP));
    const tree = buildTree(linked, DEFAULT_SETTINGS);
    expect(computeAnalytics(tree).layers).toBe(2001);
  });
});
