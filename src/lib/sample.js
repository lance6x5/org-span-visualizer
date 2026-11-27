/**
 * Sample roster of 40 fictional employees, embedded in the bundle so the
 * download/demo works offline and makes zero network requests.
 * It intentionally contains a too-wide manager (CTO, 12 reports incl. 2
 * contractors) and too-narrow managers (CFO with 2, COO with 1).
 */
const ROWS = [
  ['E001', 'Ava Chen', 'Chief Executive Officer', '', 'Executive', 'Austin', 'FTE'],
  ['E002', 'Marcus Webb', 'Chief Technology Officer', 'E001', 'Engineering', 'Austin', 'FTE'],
  ['E003', 'Priya Natarajan', 'Chief Financial Officer', 'E001', 'Finance', 'Chicago', 'FTE'],
  ['E004', 'Diego Alvarez', 'Chief Operating Officer', 'E001', 'Operations', 'Denver', 'FTE'],
  ['E005', 'Hannah Okafor', 'VP, Sales', 'E001', 'Sales', 'Chicago', 'FTE'],
  ['E006', 'Liam Foster', 'Staff Engineer', 'E002', 'Engineering', 'Austin', 'FTE'],
  ['E007', 'Sofia Rossi', 'Senior Engineer', 'E002', 'Engineering', 'Remote', 'FTE'],
  ['E008', 'Noah Kim', 'Senior Engineer', 'E002', 'Engineering', 'Austin', 'FTE'],
  ['E009', 'Emma Larsen', 'Software Engineer', 'E002', 'Engineering', 'Remote', 'FTE'],
  ['E010', 'Oliver Grant', 'Software Engineer', 'E002', 'Engineering', 'Austin', 'FTE'],
  ['E011', 'Mia Johansson', 'QA Engineer', 'E002', 'Engineering', 'Remote', 'FTE'],
  ['E012', 'Ethan Brooks', 'DevOps Engineer', 'E002', 'Engineering', 'Denver', 'FTE'],
  ['E013', 'Isabella Cruz', 'Product Designer', 'E002', 'Engineering', 'Austin', 'FTE'],
  ['E014', 'Lucas Meyer', 'Data Engineer', 'E002', 'Engineering', 'Remote', 'FTE'],
  ['E015', 'Amelia Patel', 'Security Engineer', 'E002', 'Engineering', 'Austin', 'FTE'],
  ['E016', 'James Wright', 'Contract Developer', 'E002', 'Engineering', 'Remote', 'Contractor'],
  ['E017', 'Chloe Dubois', 'Contract Developer', 'E002', 'Engineering', 'Remote', 'Contractor'],
  ['E018', 'Benjamin Hart', 'Controller', 'E003', 'Finance', 'Chicago', 'FTE'],
  ['E019', 'Grace Lin', 'FP&A Manager', 'E003', 'Finance', 'Chicago', 'FTE'],
  ['E020', 'Samuel Reyes', 'Senior Accountant', 'E018', 'Finance', 'Chicago', 'FTE'],
  ['E021', 'Zoe Mitchell', 'Accountant', 'E018', 'Finance', 'Chicago', 'FTE'],
  ['E022', 'Henry Nakamura', 'Accountant', 'E018', 'Finance', 'Remote', 'FTE'],
  ['E023', 'Lily Andersson', 'Payroll Specialist', 'E018', 'Finance', 'Chicago', 'FTE'],
  ['E024', 'Jack Thompson', 'AP Clerk', 'E018', 'Finance', 'Chicago', 'Contractor'],
  ['E025', 'Nora Fitzgerald', 'Director, Operations', 'E004', 'Operations', 'Denver', 'FTE'],
  ['E026', 'Owen Murphy', 'Operations Analyst', 'E025', 'Operations', 'Denver', 'FTE'],
  ['E027', 'Ella Novak', 'Facilities Coordinator', 'E025', 'Operations', 'Denver', 'FTE'],
  ['E028', 'Leo Santos', 'Procurement Specialist', 'E025', 'Operations', 'Remote', 'FTE'],
  ['E029', 'Aria Kowalski', 'IT Support Specialist', 'E025', 'Operations', 'Denver', 'FTE'],
  ['E030', 'Mason Bell', 'IT Support Specialist', 'E025', 'Operations', 'Austin', 'Contractor'],
  ['E031', 'Layla Hassan', 'People Operations Partner', 'E025', 'Operations', 'Remote', 'FTE'],
  ['E032', 'Caleb Turner', 'Account Executive', 'E005', 'Sales', 'Chicago', 'FTE'],
  ['E033', 'Ruby Sinclair', 'Account Executive', 'E005', 'Sales', 'Chicago', 'FTE'],
  ['E034', 'Isaac Moreau', 'Account Executive', 'E005', 'Sales', 'Remote', 'FTE'],
  ['E035', 'Stella Park', 'Account Executive', 'E005', 'Sales', 'Austin', 'FTE'],
  ['E036', 'Wyatt Coleman', 'Sales Engineer', 'E005', 'Sales', 'Austin', 'FTE'],
  ['E037', 'Hazel Ivanova', 'Sales Development Rep', 'E005', 'Sales', 'Chicago', 'FTE'],
  ['E038', 'Gabriel Silva', 'Sales Development Rep', 'E005', 'Sales', 'Remote', 'FTE'],
  ['E039', 'Violet Chang', 'Customer Success Manager', 'E005', 'Sales', 'Chicago', 'FTE'],
  ['E040', 'Julian Ward', 'Sales Operations Analyst', 'E005', 'Sales', 'Chicago', 'FTE']
];

const HEADER = ['employee_id', 'name', 'title', 'manager_id', 'department', 'location', 'employment_type'];

const esc = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export const SAMPLE_CSV = [HEADER, ...ROWS].map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
export const SAMPLE_FILE_NAME = 'sample-roster.csv';
