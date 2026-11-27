import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { hierarchy, tree as d3tree } from 'd3-hierarchy';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, zoomTransform } from 'd3-zoom';

export const NODE_W = 200;
export const NODE_H = 64;
const H_GAP = 24;
const V_GAP = 60;

const trunc = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');

/** Meta line shown under each node: direct reports and total org size. */
function metaLine(d) {
  if (d.virtual) return `${d.directCount} top-level · ${d.totalOrg} people`;
  if (d.directCount === 0) return d.contractor ? 'Contractor · no reports' : 'No direct reports';
  const counted = d.countedSpan !== d.directCount ? ` (${d.countedSpan} counted)` : '';
  return `${d.directCount} direct${counted} · ${d.totalOrg} total org`;
}

function ariaLabel(d, isCollapsed) {
  const status = { healthy: 'healthy span', narrow: 'span too narrow', wide: 'span too wide', ic: 'individual contributor', virtual: '' }[d.status];
  const parts = [d.name, d.title, metaLine(d), status];
  if (d.directCount) parts.push(isCollapsed ? 'collapsed, press Enter to expand' : 'expanded, press Enter to collapse');
  return parts.filter(Boolean).join(', ');
}

/**
 * Collapsible, zoomable, pannable top-down org tree.
 * Layout comes from d3-hierarchy; React renders SVG; d3-zoom drives the transform.
 * `apiRef` exposes { zoomBy, fit, centerOn } to the toolbar.
 */
export default function TreeView({ tree, collapsed, onToggle, focus, dataKey, svgRef, apiRef }) {
  const gRef = useRef(null);
  const zoomRef = useRef(null);
  const lastNonce = useRef(null);

  // Compute layout for the currently expanded nodes
  const root = useMemo(() => {
    const h = hierarchy(tree, (d) => (collapsed.has(d.id) ? null : d.children));
    d3tree().nodeSize([NODE_W + H_GAP, NODE_H + V_GAP]).separation((a, b) => (a.parent === b.parent ? 1 : 1.15))(h);
    return h;
  }, [tree, collapsed]);

  const nodes = root.descendants();
  const links = root.links();

  // Set up d3-zoom once (layout effect, declared before the fit effect so it runs first)
  useLayoutEffect(() => {
    const svg = select(svgRef.current);
    const z = zoom()
      .scaleExtent([0.05, 3])
      .on('zoom', (e) => {
        if (gRef.current) gRef.current.setAttribute('transform', e.transform.toString());
      });
    svg.call(z).on('dblclick.zoom', null);
    zoomRef.current = z;
    return () => svg.on('.zoom', null);
  }, [svgRef]);

  // Imperative helpers, refreshed every render so they see the latest layout
  const api = {
    zoomBy(factor) {
      select(svgRef.current).call(zoomRef.current.scaleBy, factor);
    },
    fit() {
      const svgEl = svgRef.current;
      if (!svgEl || !zoomRef.current || !nodes.length) return;
      const { width, height } = svgEl.getBoundingClientRect();
      const xs = nodes.map((n) => n.x);
      const ys = nodes.map((n) => n.y);
      const minX = Math.min(...xs) - NODE_W / 2;
      const maxX = Math.max(...xs) + NODE_W / 2;
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys) + NODE_H + 12;
      const pad = 40;
      const raw = Math.min(width / (maxX - minX + pad), height / (maxY - minY + pad));
      const k = Math.max(0.35, Math.min(1.1, raw));
      let tx, ty;
      if (raw >= 0.35) {
        tx = width / 2 - (k * (minX + maxX)) / 2;
        ty = (height - k * (maxY - minY)) / 2 - k * minY;
      } else {
        // Too big to fit legibly: center the root at the top instead
        tx = width / 2 - k * root.x;
        ty = 24 - k * minY;
      }
      select(svgEl).call(zoomRef.current.transform, zoomIdentity.translate(tx, ty).scale(k));
    },
    centerOn(id) {
      const svgEl = svgRef.current;
      const n = nodes.find((d) => d.data.id === id);
      if (!svgEl || !zoomRef.current || !n) return;
      const { width, height } = svgEl.getBoundingClientRect();
      const k = Math.max(zoomTransform(svgEl).k, 0.9);
      const t = zoomIdentity.translate(width / 2 - k * n.x, height / 3 - k * (n.y + NODE_H / 2)).scale(k);
      select(svgEl).call(zoomRef.current.transform, t);
      const el = svgEl.querySelector(`[data-id="${CSS.escape(id)}"]`);
      if (el) el.focus({ preventScroll: true });
    }
  };
  if (apiRef) apiRef.current = api;

  // Fit to screen whenever a new dataset is loaded
  useLayoutEffect(() => {
    api.fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey]);

  // Center on the searched / clicked person after the layout has updated
  useEffect(() => {
    if (focus && focus.nonce !== lastNonce.current) {
      lastNonce.current = focus.nonce;
      api.centerOn(focus.id);
    }
  });

  const onKey = (e, d) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (d.data.children.length) onToggle(d.data.id);
    }
  };

  return (
    <div className="chart-wrap">
      <svg ref={svgRef} role="group" aria-label="Org chart. Drag to pan, scroll or pinch to zoom. Tab to move between people; Enter expands or collapses.">
        <g ref={gRef}>
          {links.map((l) => {
            const sx = l.source.x;
            const sy = l.source.y + NODE_H;
            const tx = l.target.x;
            const ty = l.target.y;
            const my = sy + (ty - sy) / 2;
            return <path key={`${l.source.data.id}>${l.target.data.id}`} className="link" d={`M${sx},${sy}V${my}H${tx}V${ty}`} />;
          })}
          {nodes.map((n) => {
            const d = n.data;
            const isCollapsed = collapsed.has(d.id);
            const hasKids = d.children.length > 0;
            const hl = focus && focus.id === d.id ? ' highlight' : '';
            return (
              <g
                key={d.id}
                data-id={d.id}
                className={`node ${d.status}${hl}`}
                transform={`translate(${n.x - NODE_W / 2},${n.y})`}
                tabIndex={0}
                role="button"
                aria-label={ariaLabel(d, isCollapsed)}
                aria-expanded={hasKids ? !isCollapsed : undefined}
                onClick={() => hasKids && onToggle(d.id)}
                onKeyDown={(e) => onKey(e, n)}
              >
                <title>{`${d.name}${d.title ? ` — ${d.title}` : ''}\n${metaLine(d)}${d.department ? `\n${d.department}` : ''}${d.location ? ` · ${d.location}` : ''}`}</title>
                <rect className="node-box" width={NODE_W} height={NODE_H} rx="8" />
                {['healthy', 'narrow', 'wide'].includes(d.status) && <rect className={`node-stripe ${d.status}`} width="6" height={NODE_H} rx="3" />}
                <text className="node-name" x="14" y="20">{trunc(d.name, 25)}</text>
                <text className="node-title" x="14" y="37">{trunc(d.title, 32)}</text>
                <text className="node-meta" x="14" y="54">{trunc(metaLine(d), 34)}</text>
                {hasKids && (
                  <g className="node-toggle" transform={`translate(${NODE_W / 2},${NODE_H})`}>
                    <circle r="9" />
                    <text y="4" textAnchor="middle">{isCollapsed ? '+' : '−'}</text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <span className="chart-hint" aria-hidden="true">Drag to pan · scroll to zoom · click a node to expand/collapse</span>
    </div>
  );
}
