'use strict';

const { pool } = require('../../db');
const { encrypt, decrypt } = require('../lib/secrets');

// key -> { secret, group }. Only these keys can be read or written through the API.
const SETTINGS = {
  site_name: { group: 'general', public: true }, site_tagline: { group: 'general', public: true },
  logo_url: { group: 'general', public: true }, favicon_url: { group: 'general', public: true },
  contact_phone: { group: 'general', public: true }, contact_email: { group: 'general', public: true },
  contact_address: { group: 'general', public: true }, currency_symbol: { group: 'general', public: true },
  public_site_url: { group: 'general' }, low_stock_default: { group: 'general' }, default_sales_account_id: { group: 'general' },
  free_delivery_min_order: { group: 'delivery', public: true }, delivery_area_text: { group: 'delivery', public: true },
  theme_primary: { group: 'theme', public: true }, theme_accent: { group: 'theme', public: true },
  theme_footer_bg: { group: 'theme', public: true }, font_family: { group: 'theme', public: true },
  hero_title: { group: 'home', public: true }, hero_text: { group: 'home', public: true },
  footer_about: { group: 'footer', public: true }, footer_copyright: { group: 'footer', public: true },
  social_facebook: { group: 'footer', public: true }, social_instagram: { group: 'footer', public: true },
  social_youtube: { group: 'footer', public: true }, social_whatsapp: { group: 'footer', public: true },
  invoice_address: { group: 'invoice' }, invoice_footer: { group: 'invoice' },
  pixel_enabled: { group: 'marketing', public: true }, pixel_id: { group: 'marketing', public: true },
  capi_enabled: { group: 'marketing' }, capi_test_code: { group: 'marketing' }, capi_access_token: { group: 'marketing', secret: true },
  google_login_enabled: { group: 'login', public: true }, facebook_login_enabled: { group: 'login', public: true },
  google_client_id: { group: 'login' }, google_client_secret: { group: 'login', secret: true },
  facebook_app_id: { group: 'login' }, facebook_app_secret: { group: 'login', secret: true },
};

const FONTS = ['Roboto', 'Inter', 'Poppins', 'Open Sans', 'Lato', 'Nunito', 'Montserrat', 'Hind Siliguri', 'Noto Sans Bengali'];
const HEX = /^#[0-9a-fA-F]{6}$/;

async function getAll() {
  const [rows] = await pool.query('SELECT setting_key, setting_value, is_secret FROM site_settings');
  const out = {};
  for (const r of rows) {
    const def = SETTINGS[r.setting_key];
    if (!def) continue;
    out[r.setting_key] = def.secret ? (r.setting_value ? decrypt(r.setting_value) : '') : (r.setting_value ?? '');
  }
  return out;
}

async function get(key) {
  const all = await getAll();
  return all[key] ?? '';
}

async function publicSettings() {
  const all = await getAll();
  return Object.fromEntries(Object.entries(SETTINGS).filter(([, d]) => d.public).map(([k]) => [k, all[k] ?? '']));
}

function validate(key, value) {
  const v = value === null || value === undefined ? '' : String(value).trim();
  if (v.length > 2000) return { error: `${key} is too long.` };
  if (['theme_primary', 'theme_accent', 'theme_footer_bg'].includes(key) && v && !HEX.test(v)) return { error: 'Colours must look like #FF9933.' };
  if (key === 'font_family' && v && !FONTS.includes(v)) return { error: 'Choose a font from the list.' };
  if (/_enabled$/.test(key)) return { value: v === '1' || v === 'true' ? '1' : '0' };
  if (['free_delivery_min_order', 'low_stock_default', 'default_sales_account_id'].includes(key) && v && !/^\d+(\.\d+)?$/.test(v)) return { error: `${key} must be a number.` };
  return { value: v };
}

async function setMany(values) {
  for (const [key, raw] of Object.entries(values)) {
    const def = SETTINGS[key];
    if (!def) continue;
    // A masked or empty secret submitted back unchanged keeps the stored value.
    if (def.secret && (raw === '••••••••' || raw === undefined)) continue;
    const { error, value } = validate(key, raw);
    if (error) { const e = new Error(error); e.status = 400; throw e; }
    const stored = def.secret ? (value ? encrypt(value) : '') : value;
    await pool.query(
      'INSERT INTO site_settings (setting_key, setting_value, is_secret) VALUES (?,?,?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), is_secret = VALUES(is_secret)',
      [key, stored, def.secret ? 1 : 0]);
  }
}

module.exports = { SETTINGS, FONTS, getAll, get, publicSettings, setMany };
