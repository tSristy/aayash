'use strict';

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function validateOptionalText(value, field, max) {
  if (value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string' || value.trim().length > max) {
    invalid(`${field} must be at most ${max} characters.`);
  }
  return value.trim() || null;
}

function httpsUrl(value, field, { template = false } = {}) {
  const raw = validateOptionalText(value, field, 500);
  if (!raw) {
    return null;
  }
  if (template && !raw.includes('{tracking_id}')) {
    invalid('Tracking URL must include {tracking_id}.');
  }
  const sample = template ? raw.replaceAll('{tracking_id}', 'CN1234') : raw;
  let url;
  try {
    url = new URL(sample);
  } catch {
    invalid(`${field} must be a valid HTTPS URL.`);
  }
  if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.')) {
    invalid(`${field} must be a public HTTPS URL without credentials.`);
  }
  // No API/HTTP fetch is made with these URLs; links are shown only to Admins.
  return raw;
}

function codeFromName(name) {
  return String(name || '')
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function validateProviderInput(body, { creating = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    invalid('Courier details must be an object.');
  }
  const allowed = new Set([
    'name', 'code', 'is_active', 'contact_phone',
    'website_url', 'tracking_url_template', 'notes', 'integration_mode',
  ]);
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) {
      invalid(`Unsupported field: ${key}.`);
    }
  }

  const values = {};
  if (creating || Object.hasOwn(body, 'name')) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 120) {
      invalid('Courier name is required (1–120 characters).');
    }
    values.name = body.name.trim();
  }
  if (creating) {
    const code = body.code === undefined ? codeFromName(values.name) : String(body.code).trim().toLowerCase();
    if (!/^[a-z][a-z0-9-]{1,39}$/.test(code)) {
      invalid('Courier code must contain 2–40 lowercase letters, numbers or hyphens, starting with a letter.');
    }
    if (['all', 'unassigned'].includes(code)) {
      invalid('This courier code is reserved.');
    }
    values.code = code;
  } else if (Object.hasOwn(body, 'code')) {
    invalid('Courier code is permanent once created.');
  }

  if (Object.hasOwn(body, 'integration_mode') && body.integration_mode !== 'manual') {
    invalid('API mode is unavailable until this courier adapter is implemented and verified.');
  }
  if (Object.hasOwn(body, 'is_active')) {
    if (typeof body.is_active !== 'boolean') {
      invalid('Active status must be true or false.');
    }
    values.is_active = body.is_active;
  } else if (creating) {
    values.is_active = true;
  }
  if (Object.hasOwn(body, 'contact_phone')) {
    const phone = validateOptionalText(body.contact_phone, 'Contact number', 32);
    if (phone && !/^[+0-9 ()-]{6,32}$/.test(phone)) {
      invalid('Contact number contains unsupported characters.');
    }
    values.contact_phone = phone;
  }
  if (Object.hasOwn(body, 'website_url')) {
    values.website_url = httpsUrl(body.website_url, 'Website');
  }
  if (Object.hasOwn(body, 'tracking_url_template')) {
    values.tracking_url_template = httpsUrl(body.tracking_url_template, 'Tracking URL', { template: true });
  }
  if (Object.hasOwn(body, 'notes')) {
    values.notes = validateOptionalText(body.notes, 'Notes', 500);
  }
  if (creating) {
    values.integration_mode = 'manual';
    values.is_archived = false;
  }
  if (!creating && Object.keys(values).length === 0) {
    invalid('No courier fields were provided.');
  }
  return values;
}

module.exports = { validateProviderInput, codeFromName, httpsUrl };
