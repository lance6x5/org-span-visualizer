import React, { useEffect, useRef } from 'react';
import { buildIssueUrl } from '../lib/feedback.js';

/**
 * "Feedback" disclosure with links that open a pre-filled GitHub issue form in
 * a new tab. Plain navigations only: no network requests are made by the app.
 */
export default function FeedbackMenu() {
  const ref = useRef(null);

  // Close on Escape or when clicking outside.
  useEffect(() => {
    const el = ref.current;
    const onKey = (e) => {
      if (e.key === 'Escape' && el.open) {
        el.open = false;
        el.querySelector('summary').focus();
      }
    };
    const onDoc = (e) => {
      if (el.open && !el.contains(e.target)) el.open = false;
    };
    el.addEventListener('keydown', onKey);
    document.addEventListener('click', onDoc);
    return () => {
      el.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onDoc);
    };
  }, []);

  const close = () => {
    if (ref.current) ref.current.open = false;
  };

  return (
    <details className="feedback" ref={ref}>
      <summary className="btn btn-small" aria-label="Feedback: report a bug or request a feature">Feedback</summary>
      <div className="feedback-menu">
        <a href={buildIssueUrl('bug')} target="_blank" rel="noopener noreferrer" onClick={close}>
          Report a bug
        </a>
        <a href={buildIssueUrl('feature')} target="_blank" rel="noopener noreferrer" onClick={close}>
          Request a feature
        </a>
        <p className="muted small">Opens GitHub — a free GitHub account is required. Don't include personal data.</p>
      </div>
    </details>
  );
}
