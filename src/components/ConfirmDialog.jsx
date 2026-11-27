import React, { useEffect, useRef } from 'react';

/** Accessible modal confirmation built on the native <dialog> element. */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} aria-labelledby="confirm-title" aria-describedby="confirm-msg" onCancel={(e) => { e.preventDefault(); onCancel(); }}>
      <h2 id="confirm-title">{title}</h2>
      <p id="confirm-msg">{message}</p>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} autoFocus>Cancel</button>
        <button type="button" className="btn-danger" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </dialog>
  );
}
