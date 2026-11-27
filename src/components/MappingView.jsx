import React, { useState } from 'react';
import { FIELDS, missingRequired } from '../lib/csv.js';

/** Column-mapping step: map the user's CSV headers to the expected fields. */
export default function MappingView({ source, initialMapping, onConfirm, onCancel }) {
  const [mapping, setMapping] = useState(initialMapping);
  const missing = missingRequired(mapping);
  const preview = source.rows.slice(0, 5);

  return (
    <div className="upload-wrap">
      <section className="card stack" aria-labelledby="map-h">
        <h2 id="map-h">Map your columns</h2>
        <p className="muted">
          <strong>{source.fileName}</strong>: {source.rows.length} rows, {source.headers.length} columns. We guessed a mapping; adjust as needed.
        </p>
        {source.parseErrors.length > 0 && (
          <details className="issue">
            <summary>{source.parseErrors.length} CSV parse warning(s)</summary>
            <ul className="small">
              {source.parseErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </details>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!missing.length) onConfirm(mapping);
          }}
          className="stack"
        >
          <div className="map-grid">
            {FIELDS.map((f) => (
              <div className="field" key={f.key}>
                <label htmlFor={`map-${f.key}`}>
                  {f.label} {f.required ? <span className="req" aria-hidden="true">*</span> : <span className="muted small">(optional)</span>}
                  {f.required && <span className="sr-only"> (required)</span>}
                </label>
                <select
                  id={`map-${f.key}`}
                  value={mapping[f.key] || ''}
                  aria-required={f.required}
                  onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                >
                  <option value="">— not mapped —</option>
                  {source.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {missing.length > 0 && (
            <p className="issue error" role="status">
              Please map: {missing.join(', ')}
            </p>
          )}
          <div className="row">
            <button type="submit" className="btn-primary" disabled={missing.length > 0}>
              Build org chart
            </button>
            <button type="button" onClick={onCancel}>
              Choose a different file
            </button>
          </div>
        </form>
      </section>

      <section className="card stack" aria-labelledby="preview-h">
        <h2 id="preview-h">Preview (first {preview.length} rows)</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {FIELDS.filter((f) => mapping[f.key]).map((f) => (
                  <th key={f.key} scope="col">
                    {f.key}
                    <div className="muted small">← {mapping[f.key]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={i}>
                  {FIELDS.filter((f) => mapping[f.key]).map((f) => (
                    <td key={f.key}>{String(r[mapping[f.key]] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
