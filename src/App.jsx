import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import UploadView from './components/UploadView.jsx';
import MappingView from './components/MappingView.jsx';
import TreeView from './components/TreeView.jsx';
import ListView from './components/ListView.jsx';
import SearchBox from './components/SearchBox.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import { SettingsPanel, AnalyticsPanel, IssuesPanel } from './components/Panels.jsx';
import { analyzeRoster, walk, pathTo, DEFAULT_SETTINGS } from './lib/org.js';
import { parseCsvText, guessMapping, missingRequired } from './lib/csv.js';
import { makeSession, parseSessionJson, sanitizeSettings } from './lib/session.js';
import { loadPrefs, savePrefs, saveSession, loadSession, clearSession, resetAllStorage } from './lib/storage.js';
import { downloadText, exportPng, exportSvg } from './lib/download.js';
import { useHashRoute, navigate } from './lib/useHashRoute.js';

const AUTO_COLLAPSE_ABOVE = 150; // headcount above which deep levels start collapsed

/** Initial collapse state: show everything for small orgs, first 2 levels for big ones. */
function defaultCollapsed(tree) {
  const set = new Set();
  if (!tree) return set;
  const people = [...walk(tree)];
  if (people.length <= AUTO_COLLAPSE_ABOVE) return set;
  const minDepth = tree.virtual ? 1 : 0;
  for (const n of people) if (n.children.length && n.depth >= minDepth + 1) set.add(n.id);
  return set;
}

export default function App() {
  const route = useHashRoute();
  const [initialPrefs] = useState(loadPrefs);
  const [settings, setSettings] = useState(() => sanitizeSettings(initialPrefs.settings));
  const [saveLocally, setSaveLocally] = useState(!!initialPrefs.saveLocally);

  const [source, setSource] = useState(null); // { fileName, headers, rows, parseErrors }
  const [draftMapping, setDraftMapping] = useState(null);
  const [mapping, setMapping] = useState(null); // confirmed mapping
  const [dataKey, setDataKey] = useState(0);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [focus, setFocus] = useState(null); // { id, nonce }
  const [uploadError, setUploadError] = useState('');
  const [toast, setToast] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const svgRef = useRef(null);
  const treeApi = useRef(null);
  const jsonInput = useRef(null);

  const notify = useCallback((msg) => setToast(msg), []);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Derived: validated tree + analytics (recomputed when thresholds change)
  const analysis = useMemo(() => (source && mapping ? analyzeRoster(source.rows, mapping, settings) : null), [source, mapping, settings]);
  const tree = analysis && analysis.tree;
  const people = useMemo(() => (tree ? [...walk(tree)].filter((n) => !n.virtual) : []), [tree]);

  // Persist non-sensitive preferences
  useEffect(() => savePrefs({ settings, saveLocally }), [settings, saveLocally]);

  /** Load a session object (from IndexedDB or imported JSON) into state. */
  const applySession = useCallback((s, { silent = false } = {}) => {
    setSource({ fileName: s.fileName, headers: s.headers, rows: s.rows, parseErrors: [] });
    setSettings(sanitizeSettings(s.settings));
    setUploadError('');
    if (missingRequired(s.mapping).length === 0) {
      const a = analyzeRoster(s.rows, s.mapping, sanitizeSettings(s.settings));
      setMapping(s.mapping);
      setDraftMapping(s.mapping);
      setCollapsed(defaultCollapsed(a.tree));
      setDataKey((k) => k + 1);
      setFocus(null);
      if (!silent || !['chart', 'list'].includes(window.location.hash.replace(/^#\/?/, ''))) navigate('chart');
    } else {
      setMapping(null);
      setDraftMapping({ ...guessMapping(s.headers), ...Object.fromEntries(Object.entries(s.mapping).filter(([, v]) => v)) });
      navigate('map');
    }
  }, []);

  // Restore an opted-in saved session on startup
  useEffect(() => {
    if (!initialPrefs.saveLocally) return;
    loadSession().then((s) => {
      if (s && Array.isArray(s.rows)) {
        applySession(s, { silent: true });
        notify('Restored your locally saved session.');
      }
    });
  }, [initialPrefs, applySession, notify]);

  // Keep the opt-in local copy up to date
  useEffect(() => {
    if (saveLocally && source && mapping) {
      saveSession(makeSession({ fileName: source.fileName, headers: source.headers, rows: source.rows, mapping, settings }));
    }
  }, [saveLocally, source, mapping, settings]);

  const toggleSave = (on) => {
    setSaveLocally(on);
    if (!on) {
      clearSession();
      notify('Local copy deleted. Data now lives only in this tab.');
    } else notify('Session will be saved in this browser only.');
  };

  // ---- Input handlers ----
  const handleCsvText = (text, fileName, readError) => {
    if (readError) return setUploadError(readError);
    const { headers, rows, errors } = parseCsvText(text);
    if (!headers.length || !rows.length) {
      setUploadError(`Could not find a header row and data rows in "${fileName}". ${errors[0] || ''}`);
      return;
    }
    setUploadError('');
    setSource({ fileName, headers, rows, parseErrors: errors });
    setDraftMapping(guessMapping(headers));
    setMapping(null);
    navigate('map');
  };

  const handleImportJson = (text) => {
    const { session, error } = parseSessionJson(text);
    if (error) {
      setUploadError(error);
      notify(error);
      return;
    }
    applySession(session);
    notify(`Imported session "${session.fileName}".`);
  };

  const confirmMapping = (m) => {
    const a = analyzeRoster(source.rows, m, settings);
    if (!a.tree) {
      setUploadError('No valid employee rows were found with that mapping. Check that the Employee ID column is mapped correctly.');
      navigate('');
      return;
    }
    setMapping(m);
    setDraftMapping(m);
    setCollapsed(defaultCollapsed(a.tree));
    setFocus(null);
    setDataKey((k) => k + 1);
    navigate('chart');
  };

  // ---- Tree interactions ----
  const toggleNode = useCallback((id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** Expand ancestors of `id`, highlight it, and center the view on it. */
  const jumpTo = (id) => {
    if (!tree) return;
    const path = pathTo(tree, id);
    if (!path.length) return notify(`Could not find "${id}" in the chart.`);
    setCollapsed((prev) => {
      const next = new Set(prev);
      path.slice(0, -1).forEach((p) => next.delete(p));
      return next;
    });
    setFocus({ id, nonce: Date.now() });
    if (route !== 'chart' && route !== 'list') navigate('chart');
  };

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => {
    const s = new Set();
    for (const n of walk(tree)) if (n.children.length && n !== tree) s.add(n.id);
    setCollapsed(s);
  };

  // ---- Data menu ----
  const exportJson = () => {
    if (!source || !mapping) return notify('Nothing to export yet.');
    const s = makeSession({ fileName: source.fileName, headers: source.headers, rows: source.rows, mapping, settings });
    downloadText(JSON.stringify(s, null, 2), 'org-span-session.json', 'application/json');
  };

  const doReset = async () => {
    setConfirmReset(false);
    await resetAllStorage();
    setSource(null);
    setMapping(null);
    setDraftMapping(null);
    setCollapsed(new Set());
    setFocus(null);
    setSettings({ ...DEFAULT_SETTINGS });
    setSaveLocally(false);
    setUploadError('');
    navigate('');
    notify('All data has been cleared from this browser.');
  };

  const onExportImage = async (kind) => {
    if (!svgRef.current) return;
    try {
      if (kind === 'svg') exportSvg(svgRef.current);
      else await exportPng(svgRef.current);
    } catch (err) {
      notify(`Export failed: ${err.message}`);
    }
  };

  // ---- Routing ----
  const hasChart = !!tree;
  let view = 'upload';
  if (route === 'map' && source && draftMapping) view = 'map';
  else if ((route === 'chart' || route === 'list') && hasChart) view = route;

  const navLink = (r, label, enabled = true) => (
    <a href={`#/${r}`} aria-current={view === (r || 'upload') ? 'page' : undefined} aria-disabled={!enabled || undefined}>
      {label}
    </a>
  );

  return (
    <>
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById('main').focus(); }}>
        Skip to content
      </a>
      <header className="app-header">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
          <h1>Org Span-of-Control Visualizer</h1>
        </div>
        <nav className="nav" aria-label="Main">
          {navLink('', 'Upload')}
          {navLink('map', 'Map columns', !!source)}
          {navLink('chart', 'Chart', hasChart)}
          {navLink('list', 'List', hasChart)}
        </nav>
        <div className="row">
          <button type="button" className="btn-small" onClick={exportJson} disabled={!hasChart}>Export JSON</button>
          <button type="button" className="btn-small" onClick={() => jsonInput.current.click()}>Import JSON</button>
          <input
            ref={jsonInput}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            tabIndex={-1}
            aria-label="Import session JSON"
            onChange={async (e) => {
              const f = e.target.files[0];
              e.target.value = '';
              if (f) handleImportJson(await f.text());
            }}
          />
          <button type="button" className="btn-small btn-danger" onClick={() => setConfirmReset(true)}>Reset all data</button>
        </div>
      </header>
      <div className="privacy-banner" role="note">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
          <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z" />
        </svg>
        <span>
          <strong>Your file never leaves this browser.</strong> No network calls are made after the page loads.{' '}
          {saveLocally ? 'Session saving is ON (this browser only).' : 'Nothing is saved unless you turn on “Save session locally”.'}
        </span>
      </div>

      <main id="main" tabIndex={-1} className={`layout${view === 'chart' || view === 'list' ? ' has-sidebar' : ''}`}>
        {view === 'upload' && <UploadView onCsvText={handleCsvText} onImportJson={handleImportJson} error={uploadError} />}
        {view === 'map' && (
          <MappingView
            key={`${source.fileName}:${dataKey}:${source.headers.join('|')}`}
            source={source}
            initialMapping={draftMapping}
            onConfirm={confirmMapping}
            onCancel={() => navigate('')}
          />
        )}
        {(view === 'chart' || view === 'list') && (
          <>
            <aside className="sidebar" aria-label="Settings and analytics">
              <SettingsPanel settings={settings} onChange={setSettings} saveLocally={saveLocally} onToggleSave={toggleSave} />
              <AnalyticsPanel analytics={analysis.analytics} settings={settings} onJump={jumpTo} notify={notify} />
              <IssuesPanel issues={analysis.issues} onJump={jumpTo} />
            </aside>
            <section className="main" aria-label={view === 'chart' ? 'Org chart' : 'Org list'}>
              <div className="toolbar">
                <SearchBox people={people} onSelect={jumpTo} />
                <div className="view-toggle" role="group" aria-label="View">
                  <a href="#/chart" aria-current={view === 'chart' ? 'page' : undefined}>Tree</a>
                  <a href="#/list" aria-current={view === 'list' ? 'page' : undefined}>List</a>
                </div>
              </div>
              <div className="toolbar">
                {view === 'chart' && (
                  <div className="group" role="group" aria-label="Zoom">
                    <button type="button" className="btn-small" onClick={() => treeApi.current.zoomBy(1.25)} aria-label="Zoom in">+</button>
                    <button type="button" className="btn-small" onClick={() => treeApi.current.zoomBy(0.8)} aria-label="Zoom out">−</button>
                    <button type="button" className="btn-small" onClick={() => treeApi.current.fit()}>Fit</button>
                  </div>
                )}
                <div className="group">
                  <button type="button" className="btn-small" onClick={expandAll}>Expand all</button>
                  <button type="button" className="btn-small" onClick={collapseAll}>Collapse all</button>
                </div>
                {view === 'chart' && (
                  <div className="group" role="group" aria-label="Export chart">
                    <button type="button" className="btn-small" onClick={() => onExportImage('png')}>Export PNG</button>
                    <button type="button" className="btn-small" onClick={() => onExportImage('svg')}>Export SVG</button>
                  </div>
                )}
                <span className="muted small">{source.fileName} · {analysis.analytics.headcount} people</span>
              </div>
              {view === 'chart' ? (
                <TreeView tree={tree} collapsed={collapsed} onToggle={toggleNode} focus={focus} dataKey={dataKey} svgRef={svgRef} apiRef={treeApi} />
              ) : (
                <ListView tree={tree} collapsed={collapsed} onToggle={toggleNode} focus={focus} />
              )}
            </section>
          </>
        )}
      </main>

      <footer className="app-footer">
        Runs entirely in your browser · Works offline once loaded ·{' '}
        <a href="https://github.com/lance6x5/org-span-visualizer">Source on GitHub</a>
      </footer>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all data?"
        message="This clears the loaded roster, your column mapping, span settings, and any locally saved session from this browser. This cannot be undone."
        confirmLabel="Reset everything"
        onConfirm={doReset}
        onCancel={() => setConfirmReset(false)}
      />
      <div className="sr-only" role="status" aria-live="polite">{toast}</div>
      {toast && <div className="toast" aria-hidden="true">{toast}</div>}
    </>
  );
}
