'use strict';
/**
 * Writes QA-only records, then archives them. Do not run on live production.
 * Requires AYASHMART_ALLOW_TEST_WRITES=YES and local admin credentials.
 */
const { randomBytes } = require('node:crypto');
const BASE = (process.env.AYASHMART_TEST_URL || 'http://localhost:3000').replace(/\/$/, '');
const USER = process.env.AYASHMART_TEST_USERNAME;
const PASSWORD = process.env.AYASHMART_TEST_PASSWORD;
if (process.env.AYASHMART_ALLOW_TEST_WRITES !== 'YES' || process.env.NODE_ENV === 'production') {
  console.error('Refusing to write QA data. Use AYASHMART_ALLOW_TEST_WRITES=YES on a disposable LOCAL development DB.');
  process.exit(2);
}
if (!USER || !PASSWORD) {
  console.error('Set AYASHMART_TEST_USERNAME and AYASHMART_TEST_PASSWORD in your local terminal.');
  process.exit(2);
}
let pass = 0; let fail = 0;
function check(bool, title) { console.log(`${bool ? 'PASS' : 'FAIL'} ${title}`); bool ? pass++ : fail++; }
async function request(endpoint, init={}) {
  const response=await fetch(`${BASE}/api/admin/catalog/${endpoint}`, { cache:'no-store', ...init });
  const body=await response.json().catch(() => ({}));
  return { response, body };
}
(async()=>{
  let cookie=''; const suffix=randomBytes(4).toString('hex');
  const headers=()=>({ Cookie: cookie, Origin: BASE, 'Content-Type':'application/json' });
  try {
    let r = await request('categories');
    check(r.response.status === 401, 'Anonymous catalog list denied');
    const login=await fetch(`${BASE}/api/admin/auth/login`, { method:'POST', headers:{Origin:BASE,'Content-Type':'application/json'}, body:JSON.stringify({username:USER,password:PASSWORD}) });
    check(login.status===200, 'Admin authenticates');
    if(login.status!==200) throw new Error('Login failed; aborting test writes');
    cookie=(login.headers.get('set-cookie')||'').split(';')[0];
    if(!/^ayashmart_admin_sid=[a-f0-9]{64}$/.test(cookie)) throw new Error('Session cookie absent');
    r=await request('brands',{method:'POST',headers:headers(),body:JSON.stringify({name:`QA Brand ${suffix}`,slug:`qa-brand-${suffix}`})});
    check(r.response.status===201, 'Brand create HTTP 201');
    const brandId=r.body.id;if(!brandId) throw new Error('Brand create missing ID');
    r=await request('brands',{method:'POST',headers:headers(),body:JSON.stringify({name:`QA Brand ${suffix}`,slug:`qa-brand-${suffix}`})});
    check(r.response.status===409,'Duplicate brand slug rejected');
    r=await request('brands',{method:'POST',headers:headers(),body:JSON.stringify({name:'Malicious',id:9999})});
    check(r.response.status===422,'Protected fields rejected');
    r=await request('brands',{headers:headers()});
    check(r.response.status===200 && r.body.some(x=>x.id===brandId),'Brand appears in list');
    r=await request(`brands/${brandId}`,{method:'PATCH',headers:headers(),body:JSON.stringify({name:`QA Brand Updated ${suffix}`})});
    check(r.response.status===200 && r.body.name.includes('Updated'), 'Brand edit saved');
    r=await request('categories',{method:'POST',headers:headers(),body:JSON.stringify({name:`QA Category ${suffix}`,slug:`qa-category-${suffix}`,sort_order:50})});
    check(r.response.status===201,'Category create HTTP 201');
    const categoryId=r.body.id;if(!categoryId) throw new Error('Category create missing ID');
    r=await request(`categories/${categoryId}`,{method:'PATCH',headers:headers(),body:JSON.stringify({name:`QA Category Updated ${suffix}`})});
    check(r.response.status===200 && r.body.name.includes('Updated'),'Category edit saved');
    r=await request(`categories/${categoryId}`,{method:'PATCH',headers:headers(),body:JSON.stringify({parent_id:categoryId})});
    check(r.response.status===422,'Category cannot be its own parent');
    r=await request(`categories/${categoryId}`,{method:'PATCH',headers:headers(),body:JSON.stringify({is_active:false})});
    check(r.response.status===200 && !r.body.is_active,'Category archive saved');
    r=await request(`brands/${brandId}`,{method:'PATCH',headers:headers(),body:JSON.stringify({is_active:false})});
    check(r.response.status===200 && !r.body.is_active,'Brand archive saved');
    r=await request('brands',{method:'POST',headers:{Cookie:cookie,Origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify({name:'Should Not Create'})});
    check(r.response.status===403,'Cross-origin catalog POST denied');
    await fetch(`${BASE}/api/admin/auth/logout`,{method:'POST',headers:{Origin:BASE,Cookie:cookie}});
    r=await request('brands',{headers:headers()});
    check(r.response.status===401,'Revoked session denied');
  } catch (err) { fail++; console.error('STOPPED:',err.message); }
  console.log(`Master CRUD smoke: ${pass} PASS, ${fail} FAIL (QA records archived, not deleted).`);
  process.exitCode=fail?1:0;
})();
