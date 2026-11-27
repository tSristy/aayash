'use strict';

const express = require('express');
const { requirePermission } = require('../../../auth/access');
const { crudRouter } = require('../../../lib/crud');
const { HttpError } = require('../../../lib/http');

const router = express.Router();

// Admin-written HTML is shown to every visitor, so strip anything that can run code.
function cleanHtml(html) {
  return String(html || '')
    .replace(/<\s*(script|style|iframe|object|embed|form|meta|link|base)\b[\s\S]*?(<\s*\/\s*\1\s*>|$)/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|form|meta|link|base)\b[^>]*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')?\s*(javascript|data|vbscript):[^"'>\s]*("|')?/gi, '$1="#"');
}
router.use(requirePermission('website.manage', 'marketing.manage'));

const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const reserved = new Set(['admin', 'api', 'login', 'cart', 'products', 'orders', 'account', 'contact', 'pages', 'lp', 'checkout']);

router.use('/pages', crudRouter({
  table: 'cms_pages', entity: 'cms_page', searchColumns: ['title', 'slug'], orderBy: 't.sort_order, t.id',
  fields: [
    { name: 'slug', required: true, max: 120, pattern: slug, label: 'Slug (lowercase letters, numbers, dashes)' },
    { name: 'title', required: true, max: 200, label: 'Title' },
    { name: 'body', type: 'text', max: 200000 },
    { name: 'meta_description', max: 300 },
    { name: 'is_published', type: 'bool', default: 1 },
    { name: 'show_in_footer', type: 'bool', default: 1 },
    { name: 'sort_order', type: 'int', default: 0 },
  ],
  beforeSave: (data) => { if (data.slug && reserved.has(data.slug)) throw new HttpError(400, 'That slug is reserved.'); if (typeof data.body === 'string') data.body = cleanHtml(data.body); },
}));

const imageField = { name: 'image_url', required: true, max: 500, label: 'Image' };
router.use('/sliders', crudRouter({
  table: 'sliders', entity: 'slider', searchColumns: ['title'], orderBy: 't.sort_order, t.id',
  fields: [
    { name: 'title', max: 200 }, { name: 'subtitle', max: 300 }, imageField, { name: 'link_url', max: 500 },
    { name: 'button_text', max: 60 }, { name: 'sort_order', type: 'int', default: 0 }, { name: 'is_active', type: 'bool', default: 1 },
    { name: 'starts_at', type: 'date' }, { name: 'ends_at', type: 'date' },
  ],
}));

const PLACEMENTS = ['home_top', 'home_middle', 'home_bottom', 'products_top', 'sidebar', 'cart'];
router.use('/banners', crudRouter({
  table: 'banners', entity: 'banner', searchColumns: ['title', 'placement'], orderBy: 't.placement, t.sort_order, t.id', filters: { placement: 'placement' },
  fields: [
    { name: 'placement', type: 'enum', values: PLACEMENTS, required: true, label: 'Placement' }, { name: 'title', max: 200 }, imageField,
    { name: 'link_url', max: 500 }, { name: 'sort_order', type: 'int', default: 0 }, { name: 'is_active', type: 'bool', default: 1 },
  ],
}));
router.get('/banner-placements', (_req, res) => res.json({ items: PLACEMENTS }));

router.use('/menu-links', crudRouter({
  table: 'menu_links', entity: 'menu_link', searchColumns: ['label', 'url'], orderBy: 't.location, t.group_name, t.sort_order, t.id', filters: { location: 'location' },
  fields: [
    { name: 'location', type: 'enum', values: ['header', 'footer'], required: true }, { name: 'group_name', max: 80 },
    { name: 'label', required: true, max: 80 }, { name: 'url', required: true, max: 500, label: 'Link' },
    { name: 'sort_order', type: 'int', default: 0 }, { name: 'is_active', type: 'bool', default: 1 },
  ],
}));

router.use('/landing-pages', crudRouter({
  table: 'landing_pages', entity: 'landing_page', searchColumns: ['title', 'slug'], orderBy: 't.id DESC',
  fields: [
    { name: 'slug', required: true, max: 120, pattern: slug, label: 'Slug (lowercase letters, numbers, dashes)' },
    { name: 'title', required: true, max: 200 }, { name: 'headline', max: 255 }, { name: 'subheadline', max: 400 },
    { name: 'hero_image', max: 500 }, { name: 'body', type: 'text', max: 200000 }, { name: 'button_text', max: 60, default: 'Order now' },
    { name: 'product_ids', type: 'json' }, { name: 'is_published', type: 'bool', default: 0 },
    { name: 'badge', max: 80 }, { name: 'benefits', type: 'text', max: 3000 }, { name: 'gallery', type: 'text', max: 4000 },
    { name: 'reviews', type: 'text', max: 6000 }, { name: 'faq', type: 'text', max: 6000 },
    { name: 'offer_ends_at', type: 'date' }, { name: 'offer_note', max: 160 },
  ],
  beforeSave: (data) => {
    if (typeof data.gallery === 'string' && data.gallery.trim()) {
      let g; try { g = JSON.parse(data.gallery); } catch { g = null; }
      if (!Array.isArray(g) || g.length > 6) throw new HttpError(400, 'Gallery is invalid.');
      data.gallery = JSON.stringify(g.map((x) => ({ image_url: String(x.image_url || '').slice(0, 500), caption: String(x.caption || '').slice(0, 120) })).filter((x) => x.image_url));
    }
    if (data.slug && reserved.has(data.slug)) throw new HttpError(400, 'That slug is reserved.');
    if (typeof data.body === 'string') data.body = cleanHtml(data.body);
    if (data.product_ids !== undefined && data.product_ids !== null) {
      const ids = JSON.parse(data.product_ids);
      if (!Array.isArray(ids) || ids.length > 20 || ids.some((n) => !Number.isSafeInteger(Number(n)))) throw new HttpError(400, 'Choose up to 20 products.');
    }
  },
}));

router.use('/marketing-tags', requirePermission('marketing.manage'), crudRouter({
  table: 'marketing_tags', entity: 'marketing_tag', searchColumns: ['name'], orderBy: 't.id DESC',
  fields: [
    { name: 'name', required: true, max: 120 }, { name: 'placement', type: 'enum', values: ['head', 'body'], default: 'head' },
    { name: 'code', type: 'text', required: true, max: 20000, label: 'Tag code' }, { name: 'is_active', type: 'bool', default: 1 },
  ],
}));

module.exports = router;
