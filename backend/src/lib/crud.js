'use strict';

const express = require('express');
const { pool } = require('../../db');
const { HttpError, route, intParam, paging, pageResult, likeEscape, audit } = require('./http');

/**
 * Generic master-data CRUD router.
 * field types: str, int, num, bool, enum, date, json, fk (int), text
 */
function coerce(field, value) {
  const label = field.label || field.name;
  const empty = value === undefined || value === null || value === '';
  if (empty) {
    if (field.required) throw new HttpError(400, `${label} is required.`);
    return field.default !== undefined ? field.default : null;
  }
  switch (field.type) {
    case 'int':
    case 'fk': {
      const n = Number(value);
      if (!Number.isInteger(n) || (field.min !== undefined && n < field.min) || (field.max !== undefined && n > field.max)) {
        throw new HttpError(400, `${label} is invalid.`);
      }
      return n;
    }
    case 'num': {
      const n = Number(value);
      if (!Number.isFinite(n) || n < (field.min ?? 0) || n > (field.max ?? 1e9)) throw new HttpError(400, `${label} is invalid.`);
      return Math.round(n * 100) / 100;
    }
    case 'bool':
      return value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0;
    case 'enum':
      if (!field.values.includes(value)) throw new HttpError(400, `${label} is invalid.`);
      return value;
    case 'date': {
      const s = String(value).slice(0, 19).replace('T', ' ');
      if (Number.isNaN(Date.parse(s.replace(' ', 'T') + 'Z'))) throw new HttpError(400, `${label} is invalid.`);
      return s;
    }
    case 'json': {
      // The admin forms send JSON already encoded as text; do not encode it a second time.
      if (typeof value === 'string') {
        try { JSON.parse(value); } catch { throw new HttpError(400, `${label} is invalid.`); }
        return value;
      }
      return JSON.stringify(value);
    }
    default: {
      const s = String(value).trim();
      if (field.required && !s) throw new HttpError(400, `${label} is required.`);
      if (s.length > (field.max || (field.type === 'text' ? 100000 : 255))) throw new HttpError(400, `${label} is too long.`);
      if (field.pattern && s && !field.pattern.test(s)) throw new HttpError(400, `${label} is invalid.`);
      return s || null;
    }
  }
}

function crudRouter({ table, entity, fields, searchColumns = ['name'], orderBy = 'id DESC', filters = {}, select = null, join = '', alias = 't', beforeSave, afterSave, canDelete = true, softDelete = null }) {
  const router = express.Router();
  const names = fields.map((f) => f.name);
  const cols = select || `${alias}.*`;

  router.get('/', route(async (req, res) => {
    const list = paging(req.query, { defaultLimit: 20, max: 200 });
    const where = [];
    const params = [];
    if (req.query.q) {
      const like = `%${likeEscape(String(req.query.q).slice(0, 100))}%`;
      where.push(`(${searchColumns.map((c) => `${alias}.${c} LIKE ?`).join(' OR ')})`);
      searchColumns.forEach(() => params.push(like));
    }
    for (const [param, column] of Object.entries(filters)) {
      if (req.query[param] !== undefined && req.query[param] !== '' && req.query[param] !== 'all') {
        where.push(`${alias}.${column} = ?`);
        params.push(req.query[param]);
      }
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[count]] = await pool.query(`SELECT COUNT(*) AS n FROM ${table} ${alias} ${join} ${clause}`, params);
    const [rows] = await pool.query(
      `SELECT ${cols} FROM ${table} ${alias} ${join} ${clause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, list.limit, list.offset]
    );
    res.json(pageResult(rows, Number(count.n), list));
  }));

  router.get('/:id', route(async (req, res) => {
    const [[row]] = await pool.query(`SELECT ${cols} FROM ${table} ${alias} ${join} WHERE ${alias}.id = ?`, [intParam(req.params.id)]);
    if (!row) throw new HttpError(404, 'Record not found.');
    res.json(row);
  }));

  function payload(body, partial) {
    const out = {};
    for (const field of fields) {
      if (partial && body[field.name] === undefined) continue;
      out[field.name] = coerce(field, body[field.name]);
    }
    return out;
  }

  router.post('/', route(async (req, res) => {
    let data = payload(req.body || {}, false);
    if (beforeSave) data = (await beforeSave(data, null, req)) || data;
    const keys = Object.keys(data);
    const [result] = await pool.query(
      `INSERT INTO ${table} (${keys.map((k) => `\`${k}\``).join(',')}) VALUES (${keys.map(() => '?').join(',')})`,
      keys.map((k) => data[k])
    );
    if (afterSave) await afterSave(result.insertId, data, req);
    await audit(req.adminUser?.id, 'create', entity, result.insertId);
    const [[row]] = await pool.query(`SELECT ${cols} FROM ${table} ${alias} ${join} WHERE ${alias}.id = ?`, [result.insertId]);
    res.status(201).json(row);
  }));

  router.put('/:id', route(async (req, res) => {
    const id = intParam(req.params.id);
    const [[existing]] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    if (!existing) throw new HttpError(404, 'Record not found.');
    let data = payload(req.body || {}, true);
    if (beforeSave) data = (await beforeSave(data, existing, req)) || data;
    const keys = Object.keys(data).filter((k) => names.includes(k));
    if (keys.length) {
      await pool.query(`UPDATE ${table} SET ${keys.map((k) => `\`${k}\` = ?`).join(', ')} WHERE id = ?`, [...keys.map((k) => data[k]), id]);
    }
    if (afterSave) await afterSave(id, data, req);
    await audit(req.adminUser?.id, 'update', entity, id);
    const [[row]] = await pool.query(`SELECT ${cols} FROM ${table} ${alias} ${join} WHERE ${alias}.id = ?`, [id]);
    res.json(row);
  }));

  if (canDelete) {
    router.delete('/:id', route(async (req, res) => {
      const id = intParam(req.params.id);
      const [[existing]] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
      if (!existing) throw new HttpError(404, 'Record not found.');
      if (existing.is_system) throw new HttpError(409, 'System records cannot be deleted.');
      if (softDelete) {
        await pool.query(`UPDATE ${table} SET ${softDelete} = 0 WHERE id = ?`, [id]);
      } else {
        await pool.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
      }
      await audit(req.adminUser?.id, 'delete', entity, id);
      res.json({ ok: true });
    }));
  }

  return router;
}

module.exports = { crudRouter, coerce };
