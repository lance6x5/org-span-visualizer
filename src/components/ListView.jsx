import React, { useEffect, useMemo, useRef } from 'react';

/** Flatten the visible (non-collapsed) part of the tree into indented rows. */
function flatten(tree, collapsed) {
  const out = [];
  const visit = (n, level) => {
    out.push({ n, level });
    if (!collapsed.has(n.id)) for (const c of n.children) visit(c, level + 1);
  };
  visit(tree, 0);
  return out;
}

const STATUS_TEXT = { healthy: 'healthy', narrow: 'narrow', wide: 'wide' };

/** Compact, indented list alternative to the chart. Shares collapse state with the tree. */
export default function ListView({ tree, collapsed, onToggle, focus }) {
  const rows = useMemo(() => flatten(tree, collapsed), [tree, collapsed]);
  const listRef = useRef(null);

  useEffect(() => {
    if (!focus || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-id="${CSS.escape(focus.id)}"]`);
    if (el) {
      el.scrollIntoView({ block: 'center' });
      const btn = el.querySelector('button');
      (btn || el).focus({ preventScroll: true });
    }
  }, [focus]);

  return (
    <ul className="org-list" ref={listRef} aria-label="Org list">
      {rows.map(({ n, level }) => {
        const hasKids = n.children.length > 0;
        const isCollapsed = collapsed.has(n.id);
        return (
          <li key={n.id} data-id={n.id} className={focus && focus.id === n.id ? 'highlight' : ''} style={{ paddingLeft: `${0.4 + level * 1.1}rem` }} tabIndex={hasKids ? undefined : -1}>
            {hasKids ? (
              <button type="button" className="toggle" aria-expanded={!isCollapsed} aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${n.name}'s reports`} onClick={() => onToggle(n.id)}>
                {isCollapsed ? '+' : '−'}
              </button>
            ) : (
              <span className="spacer" aria-hidden="true" />
            )}
            <span className="name">{n.name}</span>
            <span className="title">{n.title}</span>
            {STATUS_TEXT[n.status] && <span className={`badge ${n.status}`}>{STATUS_TEXT[n.status]}</span>}
            {n.contractor && <span className="badge ctr">contractor</span>}
            {hasKids && (
              <span className="counts">
                {n.directCount} direct{n.countedSpan !== n.directCount ? ` (${n.countedSpan} counted)` : ''} · {n.totalOrg} total
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
