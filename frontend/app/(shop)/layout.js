import { CartProvider } from '@/components/CartContext';
import { SiteProvider } from '@/components/SiteContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Pixel from '@/components/Pixel';
import TagInjector from '@/components/TagInjector';
import { WishlistProvider } from '@/components/WishlistContext';
import { safe } from '@/lib/api';
import { getSite, themeVars } from '@/lib/site';

// Storefront chrome. Colours, logo, font, menus and tracking all come from Admin → Website / Marketing.
export default async function ShopLayout({ children }) {
  const [site, categories] = await Promise.all([getSite(), safe('/api/categories', [])]);
  const font = /^[\w ]{2,40}$/.test(site.settings.font_family || '') ? site.settings.font_family : null;
  return (
    <SiteProvider site={site}>
      <style dangerouslySetInnerHTML={{ __html: themeVars(site.settings) + (font && font !== 'Roboto' ? `body,button,input,select,textarea{font-family:'${font}',Roboto,system-ui,sans-serif}` : '') }} />
      {font && font !== 'Roboto' && <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, '+')}:wght@400;500;700&display=swap`} />}
      <CartProvider>
        <WishlistProvider>
          <Header categories={categories} />
          <main>{children}</main>
          <Footer />
        </WishlistProvider>
      </CartProvider>
      <Pixel />
      <TagInjector head={site.tags.head} body={site.tags.body} />
    </SiteProvider>
  );
}
