'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon';
import { NAV, isActive } from './nav';

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-ink/50 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col bg-brown px-4 py-6 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Admin navigation">
        <Link href="/admin" className="mb-8 block rounded-2xl bg-canvas px-4 py-3">
          <img src="/logo.png" alt="Aayash E-Mart" className="mx-auto h-11 w-auto" />
        </Link>

        <nav className="grid gap-1">
          {NAV.map(({ href, label, icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${active ? 'bg-white font-bold text-brown' : 'font-medium text-peach hover:bg-white/10 hover:text-white'}`}>
                <Icon name={icon} size={19} className={active ? 'text-primary-deep' : ''} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto grid gap-3 pt-6">
          <Link href="/" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-peach hover:bg-white/10 hover:text-white">
            <Icon name="store" size={19} /> View store
          </Link>
          <p className="border-t border-white/15 px-4 pt-4 text-xs leading-relaxed text-peach/80">
            Aayash E-Mart<br />© {new Date().getFullYear()} All rights reserved
          </p>
        </div>
      </aside>
    </>
  );
}
