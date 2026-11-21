'use strict';
// Run against a local DEVELOPMENT instance only. Makes actual login/logout requests.
const assert = require('node:assert/strict');
const BASE = (process.env.AYASHMART_TEST_URL || 'http://localhost:3000').replace(/\/$/, '');
const username = process.env.AYASHMART_TEST_USERNAME;
const password = process.env.AYASHMART_TEST_PASSWORD;
if (!username || !password) {
  console.error('Set AYASHMART_TEST_USERNAME and AYASHMART_TEST_PASSWORD in the local shell.');
  process.exit(2);
}
let failures = 0;
const check = (ok, label) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failures++; };
async function request(path, options = {}) {
  return fetch(`${BASE}/api/admin/auth${path}`, { cache: 'no-store', ...options });
}
(async () => {
  try {
    let response = await request('/me');
    check(response.status === 401, 'No cookie: HTTP 401');

    response = await request('/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BASE },
      body: JSON.stringify({ username, password: 'definitely-wrong-password' }) });
    check([401,429].includes(response.status), 'Invalid credentials denied');

    response = await request('/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://untrusted.invalid' },
      body: JSON.stringify({ username, password }) });
    check(response.status === 403, 'Unexpected origin blocked');

    response = await request('/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BASE },
      body: JSON.stringify({ username, password }) });
    check(response.status === 200, 'Valid credentials accepted');
    if (response.status !== 200) throw new Error('Cannot continue smoke tests without valid login.');
    const cookie = response.headers.get('set-cookie') || '';
    check(cookie.includes('HttpOnly') && /SameSite=Lax/i.test(cookie), 'Secure browser-cookie flags');
    check(!/Max-Age=0/.test(cookie), 'Non-expired session cookie');
    const session = cookie.split(';')[0];
    assert.match(session, /^ayashmart_admin_sid=[a-f0-9]{64}$/);

    response = await request('/me', { headers: { Cookie: session } });
    check(response.status === 200, 'Authenticated session recognized');

    response = await request('/probe', { headers: { Cookie: session } });
    check(response.status === 200, 'Super Admin role protected route');

    response = await request('/logout', { method: 'POST', headers: { Cookie: session, Origin: BASE } });
    check(response.status === 200, 'Logout returns OK');

    response = await request('/me', { headers: { Cookie: session } });
    check(response.status === 401, 'Revoked session rejected');
  } catch (e) { console.error('Smoke test stopped:', e.message); failures++; }
  console.log(failures ? `Auth smoke: ${failures} failure(s)` : 'Auth smoke: All checks passed');
  process.exitCode = failures ? 1 : 0;
})();
