'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon';
import { NAV, isActive } from './nav';

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-taupe-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-taupe-200 bg-white px-4 py-6 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Admin navigation"
      >
        <Link href="/admin" className="mb-8 block px-2">
          <img src="/logo.png" alt="Aayash E-Mart" className="h-12 w-auto" />
        </Link>

        <nav className="grid min-h-0 gap-1 overflow-y-auto">
          {NAV.map(({ href, label, icon }) => {
            const active = isActive(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${active ? 'bg-primary font-bold text-taupe-900' : 'font-medium text-taupe-700 hover:bg-taupe-50 hover:text-taupe-900'}`}
              >
                <Icon
                  name={icon}
                  size={19}
                  className={active ? 'text-taupe-900' : 'text-taupe'}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto grid gap-3 pt-6">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-taupe-700 hover:bg-taupe-50 hover:text-taupe-900"
          >
            <Icon name="store" size={19} className="text-taupe" />
            View store
          </Link>

          <p className="border-t border-taupe-200 px-4 pt-4 text-xs leading-relaxed text-taupe-600">
            Aayash E-Mart
            <br />
            © {new Date().getFullYear()} All rights reserved
          </p>
        </div>
      </aside>
    </>
  );
}
