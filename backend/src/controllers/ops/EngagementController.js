'use strict';

const { pool } = require('../../../db');
const { HttpError, route, intParam, text, paging, pageResult, likeEscape } = require('../../lib/http');

// ---------------------------------------------------------------- messages
const listMessages = route(async (req, res) => {
  const page = paging(req.query);
  const where = [];
  const params = [];
  if (['new', 'read', 'replied'].includes(req.query.status)) { where.push('status = ?'); params.push(req.query.status); }
  if (req.query.q) { const like = `%${likeEscape(String(req.query.q).slice(0, 100))}%`; where.push('(name LIKE ? OR phone LIKE ? OR email LIKE ? OR message LIKE ?)'); params.push(like, like, like, like); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[count]] = await pool.query(`SELECT COUNT(*) AS n FROM contact_messages ${clause}`, params);
  const [[unread]] = await pool.query("SELECT COUNT(*) AS n FROM contact_messages WHERE status = 'new'");
  const [rows] = await pool.query(`SELECT * FROM contact_messages ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, page.limit, page.offset]);
  res.json({ ...pageResult(rows, Number(count.n), page), unread: Number(unread.n) });
});
const updateMessage = route(async (req, res) => {
  const status = ['new', 'read', 'replied'].includes(req.body?.status) ? req.body.status : 'read';
  const [r] = await pool.query('UPDATE contact_messages SET status = ?, reply_note = COALESCE(?, reply_note) WHERE id = ?', [status, req.body?.reply_note !== undefined ? text(req.body.reply_note, 'Note', { max: 1000 }) : null, intParam(req.params.id)]);
  if (!r.affectedRows) throw new HttpError(404, 'Message not found.');
  res.json({ ok: true });
});
const deleteMessage = route(async (req, res) => { await pool.query('DELETE FROM contact_messages WHERE id = ?', [intParam(req.params.id)]); res.json({ ok: true }); });

const listSubscribers = route(async (req, res) => {
  const page = paging(req.query, { defaultLimit: 50 });
  const like = req.query.q ? `%${likeEscape(String(req.query.q).slice(0, 100))}%` : null;
  const [[count]] = await pool.query(`SELECT COUNT(*) AS n FROM newsletter_subscribers ${like ? 'WHERE email LIKE ?' : ''}`, like ? [like] : []);
  const [rows] = await pool.query(`SELECT * FROM newsletter_subscribers ${like ? 'WHERE email LIKE ?' : ''} ORDER BY id DESC LIMIT ? OFFSET ?`, [...(like ? [like] : []), page.limit, page.offset]);
  res.json(pageResult(rows, Number(count.n), page));
});
const deleteSubscriber = route(async (req, res) => { await pool.query('DELETE FROM newsletter_subscribers WHERE id = ?', [intParam(req.params.id)]); res.json({ ok: true }); });

// ----------------------------------------------------------------- reviews
const listReviews = route(async (req, res) => {
  const page = paging(req.query);
  const where = [];
  const params = [];
  if (['pending', 'approved', 'hidden'].includes(req.query.status)) { where.push('r.status = ?'); params.push(req.query.status); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[count]] = await pool.query(`SELECT COUNT(*) AS n FROM reviews r ${clause}`, params);
  const [[pending]] = await pool.query("SELECT COUNT(*) AS n FROM reviews WHERE status = 'pending'");
  const [rows] = await pool.query(`SELECT r.*, p.name AS product_name, p.slug AS product_slug FROM reviews r JOIN products p ON p.id = r.product_id ${clause} ORDER BY r.id DESC LIMIT ? OFFSET ?`, [...params, page.limit, page.offset]);
  res.json({ ...pageResult(rows, Number(count.n), page), pending: Number(pending.n) });
});
const moderateReview = route(async (req, res) => {
  const status = ['pending', 'approved', 'hidden'].includes(req.body?.status) ? req.body.status : null;
  const sets = [];
  const params = [];
  if (status) { sets.push('status = ?'); params.push(status); }
  if (req.body?.admin_reply !== undefined) { sets.push('admin_reply = ?'); params.push(text(req.body.admin_reply, 'Reply', { max: 1000 })); }
  if (!sets.length) throw new HttpError(400, 'Nothing to update.');
  const [r] = await pool.query(`UPDATE reviews SET ${sets.join(', ')} WHERE id = ?`, [...params, intParam(req.params.id)]);
  if (!r.affectedRows) throw new HttpError(404, 'Review not found.');
  res.json({ ok: true });
});
const deleteReview = route(async (req, res) => { await pool.query('DELETE FROM reviews WHERE id = ?', [intParam(req.params.id)]); res.json({ ok: true }); });

module.exports = { listMessages, updateMessage, deleteMessage, listSubscribers, deleteSubscriber, listReviews, moderateReview, deleteReview };
