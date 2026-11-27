import { SiteProvider } from '@/components/SiteContext';
import Pixel from '@/components/Pixel';
import TagInjector from '@/components/TagInjector';
import { getSite, themeVars } from '@/lib/site';

// Ad landing pages: no shop menu or search, so visitors stay on the offer. Theme, pixel and tags still apply.
export default async function LandingLayout({ children }) {
  const site = await getSite();
  return (
    <SiteProvider site={site}>
      <style dangerouslySetInnerHTML={{ __html: themeVars(site.settings) }} />
      <main>{children}</main>
      <Pixel />
      <TagInjector head={site.tags.head} body={site.tags.body} />
    </SiteProvider>
  );
}
