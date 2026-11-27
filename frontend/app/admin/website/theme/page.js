'use client';
import SettingsForm from '@/components/admin/ui/SettingsForm';
import { PageHeader } from '@/components/admin/ui/kit';

export default function Theme() {
  return (<><PageHeader title="Theme & branding" subtitle="Logo, colours, fonts, footer and social links. Changes appear on the shop straight away." />
    <SettingsForm save="/ops/settings/website" sections={[
      { title: 'Brand', fields: [{ key: 'site_name', label: 'Shop name' }, { key: 'site_tagline', label: 'Tagline' }, { key: 'logo_url', label: 'Logo', type: 'image' }, { key: 'favicon_url', label: 'Favicon', type: 'image' }] },
      { title: 'Colours & font', fields: [{ key: 'theme_primary', label: 'Main colour', type: 'color', help: 'Buttons, links and highlights.' }, { key: 'theme_accent', label: 'Accent colour', type: 'color', help: 'Used for the Hot tag and discount badges on the shop.' }, { key: 'theme_footer_bg', label: 'Footer background', type: 'color' }, { key: 'font_family', label: 'Font', type: 'select', optionsFrom: 'fonts' }] },
      { title: 'Home page', fields: [{ key: 'hero_title', label: 'Headline', span: 2 }, { key: 'hero_text', label: 'Text under the headline', type: 'textarea', span: 2 }, { key: 'free_delivery_min_order', label: 'Free delivery above (৳)', type: 'number', help: 'Leave 0 to switch off.' }, { key: 'delivery_area_text', label: 'Delivery area (shown at the top of the shop)', help: 'For example: Delivering across Dhaka city' }] },
      { title: 'Footer & contact', fields: [{ key: 'footer_about', label: 'About text', type: 'textarea', span: 2 }, { key: 'footer_copyright', label: 'Copyright line' }, { key: 'contact_phone', label: 'Phone' }, { key: 'contact_email', label: 'Email' }, { key: 'contact_address', label: 'Address', span: 2 }, { key: 'social_facebook', label: 'Facebook link' }, { key: 'social_instagram', label: 'Instagram link' }, { key: 'social_youtube', label: 'YouTube link' }, { key: 'social_whatsapp', label: 'WhatsApp number or link' }] },
    ]} /></>);
}
