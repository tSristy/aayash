'use client';
import ResourceManager from '@/components/admin/ui/ResourceManager';
import { Badge } from '@/components/admin/ui/kit';

const parseIds = (v) => (Array.isArray(v) ? v : (() => { try { return JSON.parse(v || '[]'); } catch { return []; } })());
const parseGallery = (v) => { try { const g = JSON.parse(v || '[]'); return Array.isArray(g) ? g : []; } catch { return []; } };
const SLOTS = [1, 2, 3];

export default function Landing() {
  return <ResourceManager title="Landing pages" subtitle="Mobile-first sales pages for Facebook and Instagram ads, with the order form built in. Live at /lp/your-slug. Anyone who starts the form is saved under Orders → Incomplete." endpoint="/ops/cms/landing-pages" noun="landing page" writePerm="marketing.manage" createLabel="Add landing page"
    columns={[{ label: 'Title', render: (l) => <b>{l.title}</b> }, { label: 'Address', render: (l) => <code>/lp/{l.slug}</code> }, { label: 'Views', align: 'right', render: (l) => l.view_count ?? 0 }, { label: 'Status', render: (l) => <Badge tone={l.is_published ? 'green' : 'gray'}>{l.is_published ? 'Live' : 'Draft'}</Badge> }]}
    toForm={(l) => {
      const g = parseGallery(l.gallery); const out = { ...l, product_ids: parseIds(l.product_ids).join(', '), offer_ends_at: l.offer_ends_at ? String(l.offer_ends_at).slice(0, 10) : '' };
      SLOTS.forEach((n) => { out[`g${n}_image`] = g[n - 1]?.image_url || ''; out[`g${n}_caption`] = g[n - 1]?.caption || ''; });
      return out;
    }}
    toPayload={(v) => {
      const { g1_image, g1_caption, g2_image, g2_caption, g3_image, g3_caption, ...rest } = v;
      const gallery = [[g1_image, g1_caption], [g2_image, g2_caption], [g3_image, g3_caption]].filter(([img]) => img).map(([image_url, caption]) => ({ image_url, caption: caption || '' }));
      return { ...rest, product_ids: JSON.stringify(String(v.product_ids || '').split(/[\s,]+/).filter(Boolean).map(Number)), gallery: JSON.stringify(gallery), offer_ends_at: v.offer_ends_at || null };
    }}
    fields={[
      { name: 'title', label: 'Internal title', required: true }, { name: 'slug', label: 'Address (slug)', required: true },
      { name: 'badge', label: 'Badge above the headline', help: 'For example: Limited offer', span: 2 },
      { name: 'headline', label: 'Headline', span: 2 }, { name: 'subheadline', label: 'Sub-headline', span: 2 },
      { name: 'hero_image', label: 'Hero image', type: 'image', span: 2 },
      { name: 'product_ids', label: 'Product IDs for the offer and order form', help: 'Comma separated, e.g. 3, 7. The first one sets the price shown at the top. Use a combo to show its free gifts.', span: 2 },
      { name: 'button_text', label: 'Button text' }, { name: 'offer_ends_at', label: 'Offer ends on (countdown)', type: 'date', help: 'Leave empty to count down to midnight each day.' },
      { name: 'offer_note', label: 'Line under the countdown', span: 2 },
      { name: 'benefits', label: 'Benefits (one per line: Title | short text)', type: 'textarea', rows: 4, span: 2 },
      ...SLOTS.flatMap((n) => [{ name: `g${n}_image`, label: `Gallery picture ${n}`, type: 'image' }, { name: `g${n}_caption`, label: `Caption ${n}` }]),
      { name: 'body', label: 'Extra selling text', type: 'richtext', span: 2 },
      { name: 'reviews', label: 'Customer reviews (one per line: Name | 1-5 | review)', type: 'textarea', rows: 4, span: 2, help: 'Only add real customer reviews.' },
      { name: 'faq', label: 'Questions (one per line: Question | Answer)', type: 'textarea', rows: 3, span: 2 },
      { name: 'is_published', label: 'Live', type: 'toggle' },
    ]}
    defaults={{ button_text: 'Order now', is_published: false, product_ids: '' }} modalWidth="max-w-3xl" />;
}
