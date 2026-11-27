import React, { useMemo, useState } from 'react';

/** Combobox-style search over name, title, id, and department. */
export default function SearchBox({ people, onSelect }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return people
      .filter((p) => [p.name, p.title, p.id, p.department].some((v) => v && v.toLowerCase().includes(term)))
      .slice(0, 10);
  }, [q, people]);

  const choose = (p) => {
    onSelect(p.id);
    setQ(p.name);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[active]) choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && results.length > 0;
  return (
    <div className="search" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <label htmlFor="search-input" className="sr-only">Find a person</label>
      <input
        id="search-input"
        type="search"
        placeholder="Find a person (name, title, ID, department)…"
        value={q}
        role="combobox"
        aria-expanded={showList}
        aria-controls="search-results"
        aria-autocomplete="list"
        aria-activedescendant={showList ? `sr-${active}` : undefined}
        autoComplete="off"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <ul id="search-results" role="listbox" aria-label="Matching people">
          {results.map((p, i) => (
            <li key={p.id} role="presentation">
              <button type="button" id={`sr-${i}`} role="option" aria-selected={i === active} tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(p)}>
                <strong>{p.name}</strong>
                <span>{[p.title, p.department, p.id].filter(Boolean).join(' · ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim() && results.length === 0 && <p className="sr-only" role="status">No matches</p>}
    </div>
  );
}
