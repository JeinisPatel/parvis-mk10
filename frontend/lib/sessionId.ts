/**
 * Per-browser session identifier for PARVIS Mk 9.
 *
 * Used primarily to isolate document storage on the backend so that
 * uploads from one visitor are not visible to another. The session id is
 * generated on first access, persisted in localStorage, and sent on every
 * API request via the `X-Session-Id` header.
 *
 * Privacy note: this is a per-browser pseudonymous identifier. It carries
 * no PII and is never sent to any third party. It exists solely to scope
 * server-side document state to the browser session.
 */

const STORAGE_KEY = 'parvis.mk9.sessionId';


function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}


/**
 * Returns the current browser session id, creating one on first call.
 * Safe to call from server-rendered code — returns empty string when
 * window is undefined.
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = generateId();
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}


/**
 * Returns headers to spread into a fetch request:
 *   fetch(url, { headers: { ...sessionHeaders() } })
 * The X-Session-Id header is omitted entirely in server-render contexts.
 */
export function sessionHeaders(): Record<string, string> {
  const id = getSessionId();
  return id ? { 'X-Session-Id': id } : {};
}


/**
 * Force a new session id (e.g. for a "start fresh" affordance).
 * Returns the new id.
 */
export function resetSessionId(): string {
  if (typeof window === 'undefined') return '';
  const id = generateId();
  window.localStorage.setItem(STORAGE_KEY, id);
  return id;
}
