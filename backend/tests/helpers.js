'use strict';

// Each test file gets its own database so files can run independently.
const mysql = require('mysql2/promise');

async function bootstrap(name) {
  process.env.NODE_ENV = 'test';
  process.env.DB_NAME = name;
  process.env.BACKGROUND_JOBS = 'off';
  process.env.COURIER_ALLOW_BASE_URL_OVERRIDE = '1';
  process.env.CORS_ORIGIN = 'http://localhost:3000';
  require('dotenv').config();
  const admin = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
  });
  await admin.query(`DROP DATABASE IF EXISTS \`${name}\``);
  await admin.end();

  const { runMigrations } = require('../src/db/migration-runner');
  await runMigrations({ log: () => {} });
  const { pool } = require('../db');
  const { app } = require('../server');
  const { hashPassword } = require('../src/auth/password');

  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;

  async function addAdmin(username, roleCode = 'super_admin') {
    await pool.query("INSERT IGNORE INTO admin_roles (code, name, is_system) VALUES ('super_admin', 'Super Admin', 1)");
    const [[role]] = await pool.query('SELECT id FROM admin_roles WHERE code = ?', [roleCode]);
    await pool.query('INSERT INTO admin_users (role_id, username, name, password_hash) VALUES (?,?,?,?)', [role.id, username, username, await hashPassword('Secret#123')]);
  }

  async function raw(method, path, { body, cookie, headers = {}, origin = true } = {}) {
    const res = await fetch(base + path, {
      method, redirect: 'manual',
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: 'http://localhost:3000' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = text; }
    return { status: res.status, body: json, headers: res.headers };
  }

  async function login(username) {
    const res = await raw('POST', '/api/admin/auth/login', { body: { username, password: 'Secret#123' } });
    if (res.status !== 200) throw new Error(`login failed: ${JSON.stringify(res.body)}`);
    return res.headers.get('set-cookie').split(';')[0];
  }

  // Convenience: authenticated admin API caller.
  const as = (cookie) => ({
    get: (p) => raw('GET', p, { cookie }), post: (p, body = {}) => raw('POST', p, { cookie, body }),
    put: (p, body = {}) => raw('PUT', p, { cookie, body }), patch: (p, body = {}) => raw('PATCH', p, { cookie, body }),
    del: (p) => raw('DELETE', p, { cookie }),
  });

  async function product({ name = 'Test product', price = 100, cost = 50, stock = 10, free = false, sku } = {}) {
    let [[cat]] = await pool.query('SELECT id FROM categories LIMIT 1');
    if (!cat) { const [c] = await pool.query("INSERT INTO categories (name, slug) VALUES ('Test cat', 'test-cat')"); cat = { id: c.insertId }; }
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).slice(2, 7)}`;
    const [p] = await pool.query("INSERT INTO products (category_id, name, slug, is_active, status, is_free_delivery) VALUES (?,?,?,1,'active',?)", [cat.id, name, slug, free ? 1 : 0]);
    const [v] = await pool.query("INSERT INTO product_variants (product_id, sku, label, price, stock, is_default, cost_price) VALUES (?,?,?,?,?,1,?)", [p.insertId, sku || `SKU-${p.insertId}`, '1 kg', price, stock, cost]);
    if (stock > 0) await pool.query("INSERT INTO stock_movements (variant_id, product_id, movement_type, qty_change, balance_after) VALUES (?,?, 'opening', ?, ?)", [v.insertId, p.insertId, stock, stock]);
    return { productId: p.insertId, variantId: v.insertId, slug };
  }

  async function courier(code = 'steadfast') {
    await pool.query("INSERT IGNORE INTO courier_providers (code, name, integration_mode, is_active) VALUES (?, ?, 'manual', 1)", [code, code]);
    return (await pool.query('SELECT id FROM courier_providers WHERE code = ?', [code]))[0][0].id;
  }

  const stock = async (variantId) => Number((await pool.query('SELECT stock FROM product_variants WHERE id = ?', [variantId]))[0][0].stock);
  const trackingCode = () => require('node:crypto').randomBytes(32).toString('hex');

  async function close() { await new Promise((r) => server.close(r)); await pool.end(); try { await require('../src/db/sequelize').sequelize.close(); } catch { /* closed */ } }

  return { pool, base, raw, login, as, addAdmin, product, courier, stock, trackingCode, close, name };
}

module.exports = { bootstrap };
