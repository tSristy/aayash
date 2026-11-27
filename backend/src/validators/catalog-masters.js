'use strict';
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
class ValidationError extends Error {
  constructor(message, status = 422) { super(message); this.status = status; }
}
const clean = (value) => typeof value === 'string' ? value.trim() : '';
const slugFromName = (s) => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
function imageValue(raw) {
  const value = clean(raw);
  if (value && (value.length > 500 || !(value.startsWith('/') && !value.startsWith('//') && !value.includes(String.fromCharCode(92)) || /^https:\/\//i.test(value)))) {
    throw new ValidationError('Image URL must be an HTTPS URL or a local /path.');
  }
  return value || null;
}
function parsePayload(body, entity, mode = 'create') {
  if (!isObject(body)) throw new ValidationError('Invalid request body.');
  const allowed = entity === 'category'
    ? ['name', 'slug', 'parent_id', 'emoji', 'image_url', 'sort_order', 'is_active']
    : ['name', 'slug', 'logo_url', 'is_active'];
  const extra = Object.keys(body).filter(k => !allowed.includes(k));
  if (extra.length) throw new ValidationError('Unknown or protected fields: ' + extra.join(', '));
  if (!Object.keys(body).length) throw new ValidationError('No fields supplied.');
  const out = {};
  if (Object.hasOwn(body, 'name')) {
    const value = clean(body.name);
    if (!value || value.length > 120) throw new ValidationError('Name must contain 1 to 120 characters.');
    out.name = value;
  } else if (mode === 'create') throw new ValidationError('Name is required.');
  if (Object.hasOwn(body, 'slug') || (mode === 'create' && out.name)) {
    const value = clean(body.slug || (mode === 'create' ? slugFromName(out.name) : '')).toLowerCase();
    if (!SLUG_RE.test(value) || value.length > 140) throw new ValidationError('Slug must contain lowercase letters, numbers and hyphens (max 140).');
    out.slug = value;
  }
  if (Object.hasOwn(body, 'is_active')) {
    if (typeof body.is_active !== 'boolean') throw new ValidationError('Active status must be true or false.');
    out.is_active = body.is_active;
  }
  if (entity === 'category') {
    if (Object.hasOwn(body, 'parent_id')) {
      const value = body.parent_id;
      if (value !== null && (!Number.isSafeInteger(Number(value)) || Number(value) <= 0)) throw new ValidationError('Parent category ID is invalid.');
      out.parent_id = value === null ? null : Number(value);
    }
    if (Object.hasOwn(body, 'sort_order')) {
      if (!Number.isInteger(body.sort_order) || Math.abs(body.sort_order) > 100000) throw new ValidationError('Sort order must be an integer between -100000 and 100000.');
      out.sort_order = body.sort_order;
    }
    if (Object.hasOwn(body, 'emoji')) {
      const val = clean(body.emoji);
      if ([...val].length > 8 || val.length > 16) throw new ValidationError('Emoji must be short.');
      out.emoji = val || null;
    }
    if (Object.hasOwn(body, 'image_url')) out.image_url = imageValue(body.image_url);
  } else if (Object.hasOwn(body, 'logo_url')) {
    out.logo_url = imageValue(body.logo_url);
  }
  return out;
}
function validId(raw) {
  const id = Number(raw);
  if (!/^[1-9][0-9]*$/.test(String(raw)) || !Number.isSafeInteger(id)) throw new ValidationError('Invalid record ID.', 400);
  return id;
}
module.exports = { ValidationError, parsePayload, validId };
