import React from 'react';
import { spanStatus } from '../lib/org.js';

/** Span distribution bar chart (inline SVG) with a screen-reader table. */
export default function Histogram({ bins, settings }) {
  if (!bins.length) return <p className="muted small">No managers to chart.</p>;
  const W = 300;
  const H = 130;
  const pad = { l: 22, r: 6, t: 8, b: 22 };
  const max = Math.max(1, ...bins.map((b) => b.count));
  const bw = (W - pad.l - pad.r) / bins.length;
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const labelEvery = Math.ceil(bins.length / 12);

  return (
    <div className="histogram">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Histogram of direct-report counts per manager">
        <line className="axis" x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} />
        <text x={pad.l - 4} y={y(max) + 4} textAnchor="end">{max}</text>
        <text x={pad.l - 4} y={H - pad.b} textAnchor="end">0</text>
        {bins.map((b, i) => {
          const status = spanStatus(1, b.span, settings);
          const x = pad.l + i * bw;
          return (
            <g key={b.span}>
              {b.count > 0 && (
                <rect className={`bar ${status}`} x={x + 1} width={Math.max(1, bw - 2)} y={y(b.count)} height={H - pad.b - y(b.count)} rx="2">
                  <title>{`Span ${b.span}: ${b.count} manager${b.count === 1 ? '' : 's'} (${status})`}</title>
                </rect>
              )}
              {i % labelEvery === 0 && (
                <text x={x + bw / 2} y={H - pad.b + 13} textAnchor="middle">{b.span}</text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="muted small" aria-hidden="true">Direct reports per manager (x) vs. number of managers (y)</p>
      <table className="sr-only">
        <caption>Span distribution</caption>
        <thead>
          <tr><th scope="col">Direct reports</th><th scope="col">Managers</th></tr>
        </thead>
        <tbody>
          {bins.map((b) => (
            <tr key={b.span}><td>{b.span}</td><td>{b.count}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
