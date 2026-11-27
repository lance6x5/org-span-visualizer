import React from 'react';
import Histogram from './Histogram.jsx';
import { flaggedToDelimited } from '../lib/csv.js';
import { downloadText } from '../lib/download.js';

const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Span-rule thresholds and contractor toggle. */
export function SettingsPanel({ settings, onChange, saveLocally, onToggleSave }) {
  const setNum = (key) => (e) => {
    const v = parseInt(e.target.value, 10);
    if (Number.isFinite(v) && v >= 0) onChange({ ...settings, [key]: v });
  };
  const invalid = settings.narrowBelow > settings.wideAbove + 1;
  return (
    <section className="card" aria-labelledby="settings-h">
      <h2 id="settings-h">Span rules</h2>
      <div className="settings-grid">
        <label htmlFor="narrow">Too narrow: fewer than</label>
        <input id="narrow" type="number" min="0" max="1000" value={settings.narrowBelow} onChange={setNum('narrowBelow')} />
        <label htmlFor="wide">Too wide: more than</label>
        <input id="wide" type="number" min="0" max="1000" value={settings.wideAbove} onChange={setNum('wideAbove')} />
      </div>
      {invalid && <p className="issue small" role="status">The narrow threshold is above the wide threshold, so no span is "healthy".</p>}
      <div className="switch" style={{ marginTop: '0.6rem' }}>
        <input id="contractors" type="checkbox" checked={settings.countContractors} onChange={(e) => onChange({ ...settings, countContractors: e.target.checked })} />
        <label htmlFor="contractors">Count contractors in spans</label>
      </div>
      <div className="switch" style={{ marginTop: '0.4rem' }}>
        <input id="save-local" type="checkbox" checked={saveLocally} onChange={(e) => onToggleSave(e.target.checked)} aria-describedby="save-local-desc" />
        <label htmlFor="save-local">Save session locally</label>
      </div>
      <p id="save-local-desc" className="muted small" style={{ margin: '0.25rem 0 0 1.6rem' }}>
        Off by default. When on, the roster is kept in this browser's IndexedDB (never sent anywhere) so it survives a reload.
      </p>
    </section>
  );
}

/** Headcount stats, histogram, and flagged managers sorted by severity. */
export function AnalyticsPanel({ analytics, settings, onJump, notify }) {
  const { flagged } = analytics;
  const exportFlagged = (delimiter, ext) => {
    downloadText(flaggedToDelimited(flagged, delimiter), `flagged-managers.${ext}`, ext === 'csv' ? 'text/csv' : 'text/tab-separated-values');
  };
  const copyTsv = async () => {
    try {
      await navigator.clipboard.writeText(flaggedToDelimited(flagged, '\t'));
      notify('Copied flagged managers as tab-separated text. Paste into Excel.');
    } catch {
      notify('Clipboard unavailable. Use "Download TSV" instead.');
    }
  };

  return (
    <section className="card" aria-labelledby="analytics-h">
      <h2 id="analytics-h">Analytics</h2>
      <dl className="stats">
        <div className="stat"><dt>Headcount</dt><dd>{analytics.headcount}</dd></div>
        <div className="stat"><dt>Managers</dt><dd>{analytics.managers}</dd></div>
        <div className="stat"><dt>Layers</dt><dd>{analytics.layers}</dd></div>
        <div className="stat"><dt>Avg span</dt><dd>{fmt(analytics.avgSpan)}</dd></div>
        <div className="stat"><dt>Median span</dt><dd>{fmt(analytics.medianSpan)}</dd></div>
        <div className="stat"><dt>Contractors</dt><dd>{analytics.contractors}</dd></div>
      </dl>
      <div className="legend" aria-label="Color legend">
        <span><span className="swatch healthy" aria-hidden="true" />Healthy ({analytics.counts.healthy})</span>
        <span><span className="swatch narrow" aria-hidden="true" />Narrow &lt; {settings.narrowBelow} ({analytics.counts.narrow})</span>
        <span><span className="swatch wide" aria-hidden="true" />Wide &gt; {settings.wideAbove} ({analytics.counts.wide})</span>
      </div>
      <h3>Span distribution</h3>
      <Histogram bins={analytics.histogram} settings={settings} />

      <h3 style={{ marginTop: '0.75rem' }}>Flagged managers ({flagged.length})</h3>
      {flagged.length === 0 ? (
        <p className="ok">All managers are within the healthy range.</p>
      ) : (
        <>
          <ul className="flag-list">
            {flagged.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => onJump(m.id)} aria-label={`${m.name}, ${m.title}, ${m.countedSpan} counted reports, too ${m.status}. Show in chart.`}>
                  <span className="who">
                    <strong>{m.name}</strong>
                    <span>{m.title || m.id}</span>
                  </span>
                  <span className={`badge ${m.status}`}>
                    {m.countedSpan} · {m.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="row">
            <button type="button" className="btn-small" onClick={() => exportFlagged(',', 'csv')}>Download CSV</button>
            <button type="button" className="btn-small" onClick={() => exportFlagged('\t', 'tsv')}>Download TSV</button>
            <button type="button" className="btn-small" onClick={copyTsv}>Copy for Excel</button>
          </div>
        </>
      )}
    </section>
  );
}

const ISSUE_LABEL = {
  missing_id: 'Missing ID',
  duplicate_id: 'Duplicate ID',
  missing_manager: 'Missing manager',
  multiple_roots: 'Multiple roots',
  cycle: 'Circular chain',
  empty: 'No data'
};

/** "Data issues" panel: validation problems found while building the tree. */
export function IssuesPanel({ issues, onJump }) {
  return (
    <section className="card" aria-labelledby="issues-h">
      <h2 id="issues-h">
        Data issues <span className={`badge ${issues.length ? 'wide' : 'healthy'}`}>{issues.length}</span>
      </h2>
      {issues.length === 0 ? (
        <p className="ok">No data issues found.</p>
      ) : (
        <ul className="issues">
          {issues.map((iss, i) => (
            <li key={i} className={`issue ${iss.severity}`}>
              <span className="kind">{ISSUE_LABEL[iss.type] || iss.type}</span>
              {iss.message}
              {iss.ids.length === 1 && iss.type !== 'duplicate_id' && (
                <>
                  {' '}
                  <button type="button" className="btn-small" onClick={() => onJump(iss.ids[0])}>Show</button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
