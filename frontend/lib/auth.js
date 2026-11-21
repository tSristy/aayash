// Auth is verified by the backend. No public credentials or localStorage sessions.
const PREFIX = '/api/admin/auth';

export async function login(username, password) {
  let res;
  try {
    res = await fetch(`${PREFIX}/login`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      cache: 'no-store',
    });
  } catch { throw new Error('Cannot connect to the backend. Please try again.'); }
  if (!res.ok) {
    if (res.status === 429) throw new Error('Too many attempts. Try again later.');
    throw new Error('Incorrect username or password.');
  }
  const data = await res.json();
  return data.user;
}

export async function getSession() {
  try {
    const res = await fetch(`${PREFIX}/me`, { credentials: 'same-origin', cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()).user;
  } catch { return null; }
}

export async function logout() {
  await fetch(`${PREFIX}/logout`, { method: 'POST', credentials: 'same-origin', cache: 'no-store' });
}
