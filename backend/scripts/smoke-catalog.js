'use strict';
/**
 * Non-mutating catalog HTTP smoke test. Requires Phase 2A migration.
 * Uses same Next.js authentication proxy as the Phase 1 smoke test.
 */
const BASE = (process.env.AYASHMART_TEST_URL || 'http://localhost:3000').replace(/\/$/, '');
const username = process.env.AYASHMART_TEST_USERNAME;
const password = process.env.AYASHMART_TEST_PASSWORD;
if (!username || !password) {
  console.error('Supply AYASHMART_TEST_USERNAME and AYASHMART_TEST_PASSWORD in your local shell.');
  process.exit(2);
}
let failures = 0;
function check(ok, label) { console.log(`${ok?'PASS':'FAIL'} ${label}`); if (!ok) failures++; }
(async () => {
  try {
    // Unauthenticated endpoint must reject access.
    let response = await fetch(`${BASE}/api/admin/catalog/overview`, { cache:'no-store' });
    check(response.status === 401, 'Catalog overview denies anonymous requests');

    response = await fetch(`${BASE}/api/admin/auth/login`, {
      method: 'POST', headers: { 'Content-Type':'application/json', Origin: BASE },
      body: JSON.stringify({ username, password }),
    });
    check(response.status === 200, 'Admin login for catalog smoke');
    if (response.status !== 200) throw new Error('Login did not succeed; run auth smoke before catalog smoke.');
    const sessionCookie = (response.headers.get('set-cookie') || '').split(';')[0];
    if (!/^ayashmart_admin_sid=[a-f0-9]{64}$/.test(sessionCookie)) throw new Error('Missing valid session cookie');
    const auth = { headers: { Cookie: sessionCookie }, cache: 'no-store' };

    response = await fetch(`${BASE}/api/admin/catalog/overview`, auth);
    check(response.status === 200, 'Protected catalog overview reachable');
    if (response.status === 200) {
      const body = await response.json();
      check(['products','variants','productTypes','attributes'].every(k=>Number.isInteger(body[k]) && body[k]>=0), 'Catalog overview has numeric counts');
      console.log(`CATALOG SUMMARY: products=${body.products}, variants=${body.variants}, productTypes=${body.productTypes}, attributes=${body.attributes}`);
    }

    for (const [path,label] of [['product-types','Product type list'],['attributes','Attribute definition list']]) {
      response = await fetch(`${BASE}/api/admin/catalog/${path}`, auth);
      check(response.status === 200, `${label} endpoint reachable`);
      if (response.status === 200) check(Array.isArray(await response.json()), `${label} returns array`);
    }
    response = await fetch(`${BASE}/api/admin/auth/logout`, { method:'POST', headers: { Cookie:sessionCookie, Origin:BASE } });
    check(response.status === 200, 'Test session logged out');
    response = await fetch(`${BASE}/api/admin/catalog/overview`, auth);
    check(response.status === 401, 'Catalog overview denies revoked session');
  } catch (error) { failures++; console.error('Smoke test stopped:', error.message); }
  console.log(failures ? `Catalog smoke: ${failures} failure(s)` : 'Catalog smoke: All checks passed');
  process.exitCode = failures ? 1 : 0;
})();
