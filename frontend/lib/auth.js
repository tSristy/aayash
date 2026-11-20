// STATIC, FRONTEND-ONLY LOGIN (placeholder until real authentication exists).
// The credentials ship inside the JavaScript bundle, so this only hides the admin UI from casual visitors.
// It does NOT protect data. Never rely on it once the backend has admin endpoints.
const KEY = 'aem-admin-session';
const SESSION_MS = 12 * 60 * 60 * 1000;

const CREDENTIALS = {
  username: process.env.NEXT_PUBLIC_ADMIN_USERNAME || 'admin',
  password: process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'aayash123',
};

export function login(username, password) {
  if (username.trim() !== CREDENTIALS.username || password !== CREDENTIALS.password) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify({ username: CREDENTIALS.username, name: 'Admin', at: Date.now() }));
  } catch { return false; }
  return true;
}

export function getSession() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!s || Date.now() - s.at > SESSION_MS) { localStorage.removeItem(KEY); return null; }
    return s;
  } catch { return null; }
}

export function logout() {
  try { localStorage.removeItem(KEY); } catch {}
}
