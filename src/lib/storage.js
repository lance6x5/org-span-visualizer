/**
 * Local persistence. Nothing about the uploaded roster is stored unless the
 * user opts in with "Save session locally". All calls are wrapped in try/catch
 * so private-mode / quota errors never break the app.
 */

const DB_NAME = 'org-span-visualizer';
const STORE = 'session';
const KEY = 'current';
const PREFS_KEY = 'osv:prefs';

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const store = t.objectStore(STORE);
      const req = fn(store);
      t.oncomplete = () => resolve(req ? req.result : undefined);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}

/** Save the session object (roster rows, mapping, settings) to IndexedDB. */
export async function saveSession(session) {
  try {
    await tx('readwrite', (s) => s.put(session, KEY));
    return true;
  } catch (err) {
    console.warn('saveSession failed', err);
    return false;
  }
}

export async function loadSession() {
  try {
    return (await tx('readonly', (s) => s.get(KEY))) || null;
  } catch (err) {
    console.warn('loadSession failed', err);
    return null;
  }
}

export async function clearSession() {
  try {
    await tx('readwrite', (s) => s.delete(KEY));
  } catch (err) {
    console.warn('clearSession failed', err);
  }
}

/** Small, non-sensitive preferences (thresholds, toggles) live in localStorage. */
export function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Wipe everything this app has stored in this browser. */
export async function resetAllStorage() {
  try {
    localStorage.removeItem(PREFS_KEY);
  } catch {
    /* ignore */
  }
  await clearSession();
}
