/**
 * CSV helpers: client-side parsing (PapaParse), automatic column mapping, and
 * flagged-manager export (CSV / TSV).
 */
import Papa from 'papaparse';

export const FIELDS = [
  { key: 'employee_id', label: 'Employee ID', required: true, synonyms: ['employee_id', 'employeeid', 'emp_id', 'empid', 'id', 'employee_number', 'employee_no', 'worker_id', 'person_id', 'staff_id'] },
  { key: 'name', label: 'Name', required: true, synonyms: ['name', 'full_name', 'fullname', 'employee_name', 'display_name', 'worker_name'] },
  { key: 'title', label: 'Title', required: true, synonyms: ['title', 'job_title', 'jobtitle', 'position', 'role', 'job'] },
  { key: 'manager_id', label: 'Manager ID', required: true, synonyms: ['manager_id', 'managerid', 'mgr_id', 'supervisor_id', 'reports_to', 'reportsto', 'manager_employee_id', 'boss_id', 'parent_id'] },
  { key: 'department', label: 'Department', required: false, synonyms: ['department', 'dept', 'team', 'division', 'org', 'business_unit', 'function'] },
  { key: 'location', label: 'Location', required: false, synonyms: ['location', 'office', 'site', 'city', 'work_location'] },
  { key: 'employment_type', label: 'Employment type (FTE/contractor)', required: false, synonyms: ['employment_type', 'employmenttype', 'worker_type', 'type', 'emp_type', 'employee_type', 'fte_contractor', 'contract_type'] }
];

const norm = (s) => String(s).trim().toLowerCase().replace(/[\s\-./]+/g, '_');

/** Guess a { field: header } mapping from header names. Each header is used at most once. */
export function guessMapping(headers) {
  const mapping = {};
  const used = new Set();
  const normalized = headers.map((h) => [h, norm(h)]);
  for (const f of FIELDS) {
    // Exact synonym match first, then "contains" match
    let hit = normalized.find(([h, n]) => !used.has(h) && f.synonyms.includes(n));
    if (!hit && f.key !== 'employee_id') {
      hit = normalized.find(([h, n]) => !used.has(h) && f.synonyms.some((s) => s.length > 3 && n.includes(s)));
    }
    mapping[f.key] = hit ? hit[0] : '';
    if (hit) used.add(hit[0]);
  }
  return mapping;
}

/** Fields that are required but not mapped. */
export function missingRequired(mapping) {
  return FIELDS.filter((f) => f.required && !mapping[f.key]).map((f) => f.label);
}

/** Parse CSV text. Returns { headers, rows, errors }. Never throws. */
export function parseCsvText(text) {
  try {
    const res = Papa.parse(text, { header: true, skipEmptyLines: 'greedy', transformHeader: (h) => h.trim() });
    const headers = (res.meta.fields || []).filter((h) => h !== '');
    const errors = (res.errors || []).slice(0, 20).map((e) => `Row ${e.row != null ? e.row + 2 : '?'}: ${e.message}`);
    return { headers, rows: res.data, errors };
  } catch (err) {
    return { headers: [], rows: [], errors: [String(err && err.message ? err.message : err)] };
  }
}

/** Read a File object and parse it locally. */
export function parseCsvFile(file) {
  return file.text().then(parseCsvText);
}

/** Serialize flagged managers. delimiter: ',' for CSV or '\t' for TSV. */
export function flaggedToDelimited(flagged, delimiter = ',') {
  const data = flagged.map((m) => ({
    employee_id: m.id,
    name: m.name,
    title: m.title,
    department: m.department,
    location: m.location,
    status: m.status === 'wide' ? 'too wide' : 'too narrow',
    direct_reports: m.directCount,
    counted_span: m.countedSpan,
    total_org_size: m.totalOrg,
    severity: m.severity.toFixed(2)
  }));
  const fields = ['employee_id', 'name', 'title', 'department', 'location', 'status', 'direct_reports', 'counted_span', 'total_org_size', 'severity'];
  return Papa.unparse({ fields, data: data.map((d) => fields.map((f) => d[f])) }, { delimiter, newline: '\r\n' });
}
