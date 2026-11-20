'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { NAV, isActive } from './nav';

export default function Topbar({ session, onMenu, onSignOut }) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);
  const title = NAV.find((n) => isActive(pathname, n.href))?.label || 'Dashboard';

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenu(false); };
    const esc = (e) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-taupe-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button onClick={onMenu} className="rounded-lg p-2 text-taupe-700 hover:bg-taupe-50 lg:hidden" aria-label="Open menu"><Icon name="menu" /></button>
        <h1 className="text-xl text-taupe-900">{title}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button className="relative rounded-full p-2 text-taupe-700 hover:bg-taupe-50" aria-label="Notifications">
          <Icon name="bell" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
        </button>

        <div className="relative" ref={ref}>
          <button onClick={() => setMenu(!menu)} aria-expanded={menu} aria-haspopup="menu"
            className="flex items-center gap-2.5 rounded-xl p-1.5 pr-2 hover:bg-taupe-50">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary font-display font-extrabold text-taupe-900">{session.name[0]}</span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-bold">{session.name}</span>
              <span className="block text-xs text-taupe-600">Administrator</span>
            </span>
            <Icon name="chevron" size={16} className="text-taupe" />
          </button>
          {menu && (
            <div role="menu" className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-xl border border-taupe-200 bg-white py-1 shadow-[0_12px_30px_rgba(43,40,35,.12)]">
              <Link role="menuitem" href="/" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-taupe-50"><Icon name="store" size={16} /> View store</Link>
              <button role="menuitem" onClick={onSignOut} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-taupe-50"><Icon name="logout" size={16} /> Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
