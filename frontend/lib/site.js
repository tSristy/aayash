import { safe } from './api';

export const EMPTY_SITE = { settings: {}, menus: { header: [], footer: [] }, footerPages: [], sliders: [], banners: {}, tags: { head: [], body: [] } };
export const getSite = () => safe('/api/site', EMPTY_SITE);

const clean = (hex, fallback) => (/^#[0-9a-f]{6}$/i.test(String(hex || '')) ? hex : fallback);
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const str = (c) => c.join(' ');

/** CSS variables for the storefront theme, derived from the admin's chosen colours. */
export function themeVars(settings) {
  const p = rgb(clean(settings.theme_primary, '#FF9933'));
  const footer = rgb(clean(settings.theme_footer_bg, '#5E2409'));
  const accent = rgb(clean(settings.theme_accent, '#FF9933'));
  return `:root{--c-primary:${str(p)};--c-primary-hover:${str(mix(p, [255, 255, 255], 0.15))};--c-primary-deep:${str(mix(p, [0, 0, 0], 0.42))};--c-primary-soft:${str(mix(p, [255, 255, 255], 0.45))};--c-footer:${str(footer)};--c-accent:${str(accent)}}`;
}
