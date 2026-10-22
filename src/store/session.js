// Session + auth helpers. Invite code (?code= -> localStorage ns-code),
// per-browser voter id (ns-voter), header builder, authed fetch wrapper.

const CODE_KEY = 'ns-code';
const VOTER_KEY = 'ns-voter';
const ADMIN_KEY = 'ns-admin';

function readParamCode() {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = (params.get('code') || '').trim();
    if (!fromUrl) return '';
    localStorage.setItem(CODE_KEY, fromUrl);
    params.delete('code');
    const rest = params.toString();
    const clean = `${window.location.pathname}${rest ? `?${rest}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', clean);
    return fromUrl;
  } catch {
    return '';
  }
}

export function getInviteCode() {
  const fromUrl = readParamCode();
  if (fromUrl) return fromUrl;
  try {
    return localStorage.getItem(CODE_KEY) || '';
  } catch {
    return '';
  }
}

export function setInviteCode(code) {
  try {
    localStorage.setItem(CODE_KEY, code);
  } catch {
    // storage unavailable (private mode) — session-only auth still works
  }
}

export function clearInviteCode() {
  try {
    localStorage.removeItem(CODE_KEY);
  } catch {
    // ignore
  }
}

export function getAdminCode() {
  try {
    return localStorage.getItem(ADMIN_KEY) || '';
  } catch {
    return '';
  }
}

export function setAdminCode(code) {
  try {
    localStorage.setItem(ADMIN_KEY, code);
  } catch {
    // ignore
  }
}

function randomHex(bytes = 8) {
  try {
    const buf = new Uint8Array(bytes);
    window.crypto.getRandomValues(buf);
    return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return `v-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
  }
}

export function getVoterId() {
  try {
    let id = localStorage.getItem(VOTER_KEY);
    if (!id) {
      id = randomHex();
      localStorage.setItem(VOTER_KEY, id);
    }
    return id;
  } catch {
    return randomHex();
  }
}

// Headers for every /api call. Admin routes add x-admin-code on top.
export function buildHeaders(extra = {}, adminCode = '') {
  const headers = {
    'x-invite-code': getInviteCode(),
    'x-voter-id': getVoterId(),
    ...extra,
  };
  if (adminCode) headers['x-admin-code'] = adminCode;
  return headers;
}

// authFetch(path, init) — same-origin JSON wrapper. Throws Error with
// `.status`; on 401 the stored code is cleared and onUnauthorized fires
// so the app can fall back to the gate view.
export function createAuthFetch({ onUnauthorized } = {}) {
  return async function authFetch(path, init = {}) {
    const hasBody = init.body !== undefined;
    const res = await fetch(path, {
      ...init,
      headers: buildHeaders(
        {
          ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
          ...(init.headers || {}),
        },
        getAdminCode(),
      ),
    });
    if (res.status === 401) {
      clearInviteCode();
      if (typeof onUnauthorized === 'function') onUnauthorized();
      const err = new Error('Invite code rejected (401).');
      err.status = 401;
      throw err;
    }
    if (!res.ok) {
      let detail = '';
      try {
        const data = await res.clone().json();
        detail = data.match || data.error || data.message || '';
      } catch {
        // non-JSON error body — fall through to status text
      }
      const err = new Error(detail || `Request failed (${res.status}).`);
      err.status = res.status;
      throw err;
    }
    return res;
  };
}
