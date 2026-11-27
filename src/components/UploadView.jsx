import React, { useRef, useState } from 'react';
import { SAMPLE_CSV, SAMPLE_FILE_NAME } from '../lib/sample.js';
import { downloadText } from '../lib/download.js';

/**
 * Landing view: drag-and-drop or pick a CSV, load the built-in sample,
 * or import a previously exported session JSON.
 */
export default function UploadView({ onCsvText, onImportJson, error }) {
  const [dragging, setDragging] = useState(false);
  const csvInput = useRef(null);
  const jsonInput = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      if (/\.json$/i.test(file.name) || file.type === 'application/json') onImportJson(text);
      else onCsvText(text, file.name);
    } catch (err) {
      onCsvText('', file.name, `Could not read file: ${err.message}`);
    }
  };

  return (
    <div className="upload-wrap">
      <section className="card stack" aria-labelledby="upload-h">
        <h2 id="upload-h">Upload an org roster</h2>
        <p className="muted">
          CSV with columns <code>employee_id</code>, <code>name</code>, <code>title</code>, <code>manager_id</code> (optional: <code>department</code>,{' '}
          <code>location</code>, <code>employment_type</code>). Your own column names are fine; you will map them next.
        </p>
        <div
          className={`dropzone${dragging ? ' dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files && e.dataTransfer.files[0]);
          }}
        >
          <p><strong>Drag and drop a CSV file here</strong></p>
          <p className="muted">or</p>
          <button type="button" className="btn-primary" onClick={() => csvInput.current.click()}>
            Choose CSV file
          </button>
          <input
            ref={csvInput}
            type="file"
            accept=".csv,.tsv,.txt,text/csv"
            className="sr-only"
            aria-label="Choose CSV file"
            tabIndex={-1}
            onChange={(e) => {
              handleFile(e.target.files[0]);
              e.target.value = '';
            }}
          />
          <p className="muted small">Parsed locally with PapaParse. Nothing is uploaded anywhere.</p>
        </div>
        {error && (
          <p role="alert" className="issue error">
            {error}
          </p>
        )}
      </section>

      <section className="card stack" aria-labelledby="sample-h">
        <h2 id="sample-h">No file handy?</h2>
        <p className="muted">Try a fictional 40-person company that includes a too-wide CTO and a couple of too-narrow managers.</p>
        <div className="row">
          <button type="button" onClick={() => onCsvText(SAMPLE_CSV, SAMPLE_FILE_NAME)}>
            Load sample data
          </button>
          <button type="button" onClick={() => downloadText(SAMPLE_CSV, SAMPLE_FILE_NAME, 'text/csv')}>
            Download sample CSV
          </button>
        </div>
      </section>

      <section className="card stack" aria-labelledby="import-h">
        <h2 id="import-h">Restore a session</h2>
        <p className="muted">Import a JSON session file you previously exported from Spanscope.</p>
        <div className="row">
          <button type="button" onClick={() => jsonInput.current.click()}>
            Import session JSON
          </button>
          <input
            ref={jsonInput}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            aria-label="Import session JSON"
            tabIndex={-1}
            onChange={(e) => {
              handleFile(e.target.files[0]);
              e.target.value = '';
            }}
          />
        </div>
      </section>
    </div>
  );
}
