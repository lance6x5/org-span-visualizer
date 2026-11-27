/**
 * Org model: turns mapped roster rows into a validated tree with span metrics.
 * Pure functions only (no DOM), so everything here is unit-tested.
 */

export const VIRTUAL_ROOT_ID = '__org_root__';

export const DEFAULT_SETTINGS = Object.freeze({
  narrowBelow: 4, // span < narrowBelow  -> "narrow"
  wideAbove: 10, // span > wideAbove    -> "wide"
  countContractors: true
});

const CONTRACTOR_RE = /contract|contingent|vendor|temp|ctr|consult/i;

/** True when an employment_type value denotes a contractor rather than FTE. */
export function isContractor(employmentType) {
  return !!employmentType && CONTRACTOR_RE.test(String(employmentType));
}

/**
 * Convert raw CSV rows into normalized person records using a column mapping
 * ({ field: headerName }). Blank IDs are reported rather than dropped silently.
 */
export function normalizeRows(rows, mapping) {
  const get = (row, field) => {
    const col = mapping[field];
    if (!col) return '';
    const v = row[col];
    return v == null ? '' : String(v).trim();
  };
  return rows.map((row, index) => ({
    id: get(row, 'employee_id'),
    name: get(row, 'name'),
    title: get(row, 'title'),
    managerId: get(row, 'manager_id'),
    department: get(row, 'department'),
    location: get(row, 'location'),
    employmentType: get(row, 'employment_type'),
    rowNumber: index + 2 // +1 for header, +1 for 1-based
  }));
}

/**
 * Validate records and build the parent/child structure.
 * Returns { people: Map<id, person>, children: Map<id, id[]>, roots: id[], issues: Issue[] }.
 * Never throws on bad data: problems are collected into `issues` and repaired
 * (duplicates dropped, cycles broken, orphans promoted to roots).
 */
export function validateAndLink(records) {
  const issues = [];
  const people = new Map();

  // 1. Blank and duplicate IDs
  for (const r of records) {
    if (!r.id) {
      issues.push({ type: 'missing_id', severity: 'error', message: `Row ${r.rowNumber} has no employee_id and was skipped.`, ids: [] });
      continue;
    }
    if (people.has(r.id)) {
      const first = people.get(r.id);
      issues.push({
        type: 'duplicate_id',
        severity: 'error',
        message: `Duplicate employee_id "${r.id}" (rows ${first.rowNumber} and ${r.rowNumber}). Kept the first, skipped row ${r.rowNumber}.`,
        ids: [r.id]
      });
      continue;
    }
    people.set(r.id, { ...r, parentId: null });
  }

  // 2. Resolve manager links
  for (const p of people.values()) {
    if (!p.managerId) continue;
    if (p.managerId === p.id) {
      issues.push({ type: 'cycle', severity: 'error', message: `${label(p)} lists themself as their own manager. Treated as a top-level person.`, ids: [p.id] });
      continue;
    }
    if (!people.has(p.managerId)) {
      issues.push({
        type: 'missing_manager',
        severity: 'warning',
        message: `${label(p)} reports to manager_id "${p.managerId}", which is not in the file. Shown as a top-level person.`,
        ids: [p.id]
      });
      continue;
    }
    p.parentId = p.managerId;
  }

  // 3. Detect and break circular chains (A -> B -> C -> A)
  const state = new Map(); // id -> 1 (in progress) | 2 (done)
  for (const start of people.keys()) {
    if (state.get(start) === 2) continue;
    const path = [];
    const onPath = new Map();
    let cur = start;
    while (cur != null && state.get(cur) !== 2) {
      if (onPath.has(cur)) {
        const cycle = path.slice(onPath.get(cur));
        // Break at the lexicographically smallest id for deterministic output
        const breakAt = [...cycle].sort()[0];
        people.get(breakAt).parentId = null;
        issues.push({
          type: 'cycle',
          severity: 'error',
          message: `Circular reporting chain: ${cycle.map((id) => label(people.get(id))).join(' → ')} → back to start. Broke the loop at ${label(people.get(breakAt))}.`,
          ids: cycle
        });
        break;
      }
      onPath.set(cur, path.length);
      path.push(cur);
      cur = people.get(cur).parentId;
    }
    for (const id of path) state.set(id, 2);
  }

  // 4. Children lists and roots
  const children = new Map();
  const roots = [];
  for (const p of people.values()) {
    if (p.parentId == null) roots.push(p.id);
    else {
      if (!children.has(p.parentId)) children.set(p.parentId, []);
      children.get(p.parentId).push(p.id);
    }
  }

  if (roots.length > 1) {
    const shown = roots.slice(0, 8).map((id) => label(people.get(id))).join(', ');
    issues.push({
      type: 'multiple_roots',
      severity: 'warning',
      message: `Found ${roots.length} top-level people (no manager in file): ${shown}${roots.length > 8 ? ', …' : ''}. They are grouped under a virtual "Organization" node.`,
      ids: roots.slice()
    });
  }
  if (people.size === 0) {
    issues.push({ type: 'empty', severity: 'error', message: 'No valid employee rows were found.', ids: [] });
  }

  return { people, children, roots, issues };
}

function label(p) {
  return p.name ? `${p.name} (${p.id})` : `"${p.id}"`;
}

/** Classify a manager's span against thresholds. Individual contributors get "ic". */
export function spanStatus(directCount, countedSpan, settings) {
  if (directCount === 0) return 'ic';
  if (countedSpan > settings.wideAbove) return 'wide';
  if (countedSpan < settings.narrowBelow) return 'narrow';
  return 'healthy';
}

/** Severity score (0..∞) used to sort flagged managers: distance outside the healthy band, relative. */
export function severityScore(status, span, settings) {
  if (status === 'wide') return (span - settings.wideAbove) / Math.max(1, settings.wideAbove);
  if (status === 'narrow') return (settings.narrowBelow - span) / Math.max(1, settings.narrowBelow);
  return 0;
}

/**
 * Build the full nested tree with metrics.
 * Each node: { id, name, title, department, location, employmentType, contractor,
 *   depth, children[], directCount, countedSpan, totalOrg, status, severity, virtual }
 */
export function buildTree(linked, settings = DEFAULT_SETTINGS) {
  const { people, children, roots } = linked;

  const make = (id, depth) => {
    const p = people.get(id);
    const kids = (children.get(id) || []).map((cid) => make(cid, depth + 1));
    kids.sort((a, b) => b.totalOrg - a.totalOrg || a.name.localeCompare(b.name));
    const directCount = kids.length;
    const countedSpan = settings.countContractors ? directCount : kids.filter((k) => !k.contractor).length;
    const totalOrg = kids.reduce((sum, k) => sum + 1 + k.totalOrg, 0);
    const status = spanStatus(directCount, countedSpan, settings);
    return {
      id: p.id,
      name: p.name || p.id,
      title: p.title,
      department: p.department,
      location: p.location,
      employmentType: p.employmentType,
      contractor: isContractor(p.employmentType),
      managerId: p.parentId,
      depth,
      children: kids,
      directCount,
      countedSpan,
      totalOrg,
      status,
      severity: severityScore(status, countedSpan, settings),
      virtual: false
    };
  };

  if (roots.length === 1) return make(roots[0], 0);

  // Multiple (or zero) roots: wrap them in a virtual node that is excluded from metrics
  const kids = roots.map((id) => make(id, 1));
  kids.sort((a, b) => b.totalOrg - a.totalOrg || a.name.localeCompare(b.name));
  return {
    id: VIRTUAL_ROOT_ID,
    name: 'Organization',
    title: `${roots.length} top-level people`,
    department: '',
    location: '',
    employmentType: '',
    contractor: false,
    managerId: null,
    depth: 0,
    children: kids,
    directCount: kids.length,
    countedSpan: kids.length,
    totalOrg: kids.reduce((s, k) => s + 1 + k.totalOrg, 0),
    status: 'virtual',
    severity: 0,
    virtual: true
  };
}

/** Depth-first iteration over a tree (skips nothing; callers filter virtual). */
export function* walk(node) {
  yield node;
  for (const c of node.children) yield* walk(c);
}

export function median(values) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Summary analytics for the side panel. */
export function computeAnalytics(tree) {
  const real = [...walk(tree)].filter((n) => !n.virtual);
  const managers = real.filter((n) => n.directCount > 0);
  const spans = managers.map((m) => m.countedSpan);
  const minDepth = tree.virtual ? 1 : 0;
  const layers = real.length ? Math.max(...real.map((n) => n.depth)) - minDepth + 1 : 0;

  const flagged = managers
    .filter((m) => m.status === 'wide' || m.status === 'narrow')
    .sort((a, b) => b.severity - a.severity || b.countedSpan - a.countedSpan || a.name.localeCompare(b.name));

  // Histogram: one bin per span value from 1..max
  const maxSpan = spans.length ? Math.max(...spans) : 0;
  const histogram = [];
  for (let s = 0; s <= maxSpan; s++) histogram.push({ span: s, count: 0 });
  for (const s of spans) histogram[s].count++;
  // Drop a leading zero-span bin when nobody has 0 counted reports
  if (histogram.length && histogram[0].count === 0) histogram.shift();

  return {
    headcount: real.length,
    managers: managers.length,
    contractors: real.filter((n) => n.contractor).length,
    layers,
    avgSpan: spans.length ? spans.reduce((a, b) => a + b, 0) / spans.length : 0,
    medianSpan: median(spans),
    flagged,
    histogram,
    counts: {
      healthy: managers.filter((m) => m.status === 'healthy').length,
      narrow: managers.filter((m) => m.status === 'narrow').length,
      wide: managers.filter((m) => m.status === 'wide').length
    }
  };
}

/** Return ids on the path from root to target (inclusive), or [] if not found. */
export function pathTo(tree, targetId) {
  const stack = [];
  const visit = (n) => {
    stack.push(n.id);
    if (n.id === targetId) return true;
    for (const c of n.children) if (visit(c)) return true;
    stack.pop();
    return false;
  };
  return visit(tree) ? stack : [];
}

/** Convenience: rows + mapping + settings -> { tree, issues, analytics } */
export function analyzeRoster(rows, mapping, settings = DEFAULT_SETTINGS) {
  const linked = validateAndLink(normalizeRows(rows, mapping));
  const tree = linked.people.size ? buildTree(linked, settings) : null;
  return { tree, issues: linked.issues, analytics: tree ? computeAnalytics(tree) : null };
}
