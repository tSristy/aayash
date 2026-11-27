'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSession, logout } from '@/lib/auth';
import { api } from '@/lib/admin-api';
import useLogo from '@/lib/useLogo';
import { AdminCtx } from './AdminContext';
import { visibleNav, isActive, flatItems } from './nav';
import I from './ui/Icons';
import { Menu, MenuItem, ToastProvider } from './ui/kit';

const QUICK = [
  { href: '/admin/orders/new', label: 'Create order', icon: 'orders', perm: ['orders.create', 'orders.manage'] },
  { href: '/admin/pos', label: 'POS sale', icon: 'pos', perm: ['pos.use'] },
  { href: '/admin/products/new', label: 'Add product', icon: 'box', perm: ['products.manage'] },
  { href: '/admin/purchases/new', label: 'New purchase', icon: 'cart', perm: ['purchases.manage'] },
  { href: '/admin/accounts/transactions?new=expense', label: 'Add expense', icon: 'wallet', perm: ['accounts.manage'] },
];
const CENTER = ['/admin', '/admin/orders', '/admin/products', '/admin/customers', '/admin/accounts'];

function Avatar({ name, size = 36 }) {
  return <span style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-full bg-taupe-900 font-bold text-white">{(name || '?')[0].toUpperCase()}</span>;
}

function SearchMenu({ items }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return items.filter((i) => `${i.label} ${i.group}`.toLowerCase().includes(s)).slice(0, 8);
  }, [q, items]);
  return (
    <div className="relative w-full max-w-[280px]" ref={ref}>
      <I name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-taupe-600" />
      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search menu…" aria-label="Search menu"
        onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) { router.push(results[0].href); setQ(''); setOpen(false); } }}
        className="w-full rounded-full bg-taupe-100 py-2.5 pl-10 pr-4 text-sm placeholder:text-taupe-600 focus:bg-white focus:shadow-card focus:outline-none focus:ring-2 focus:ring-primary/40" />
      {open && q && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl bg-white py-1 shadow-pop">
          {results.length === 0 && <p className="px-4 py-3 text-sm text-taupe-600">No matching page.</p>}
          {results.map((r) => (
            <Link key={r.href} href={r.href} onClick={() => { setQ(''); setOpen(false); }} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-taupe-50">
              <I name={r.icon} size={17} className="text-taupe" /><span>{r.label}</span>{r.group && <span className="ml-auto text-xs text-taupe-600">{r.group}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Sidebar({ nav, pathname, session, open, onClose }) {
  const [expanded, setExpanded] = useState({});
  useEffect(() => {
    const g = nav.find((x) => x.children?.some((c) => isActive(pathname, c.href)));
    if (g) setExpanded((e) => ({ ...e, [g.id]: true }));
  }, [pathname, nav]);
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-taupe-900/40 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside aria-label="Admin navigation" className={`print:hidden fixed bottom-0 left-0 top-14 z-30 w-[300px] max-w-[86vw] overflow-y-auto bg-wash px-2 pb-8 pt-3 transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <Link href="/admin/account" className="mb-2 flex items-center gap-3 rounded-xl p-2 hover:bg-taupe-100">
          <Avatar name={session.name} size={40} />
          <span className="min-w-0 leading-tight"><span className="block truncate font-bold">{session.name}</span><span className="block truncate text-xs text-taupe-600"><span className="capitalize">{session.role ? String(session.role).replace(/_/g, ' ') : 'Administrator'}</span></span></span>
        </Link>
        <nav className="grid gap-0.5">
          {nav.map((g) => {
            if (!g.children) {
              const active = isActive(pathname, g.href);
              return <Row key={g.id} href={g.href} icon={g.icon} label={g.label} active={active} onClick={onClose} />;
            }
            const groupActive = g.children.some((c) => isActive(pathname, c.href));
            const isOpen = !!expanded[g.id];
            return (
              <div key={g.id}>
                <button type="button" aria-expanded={isOpen} onClick={() => setExpanded((e) => ({ ...e, [g.id]: !e[g.id] }))}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-taupe-100">
                  <Chip icon={g.icon} on={groupActive} />
                  <span className={`flex-1 text-[15px] ${groupActive ? 'font-bold' : 'font-medium'} text-taupe-900`}>{g.label}</span>
                  <I name="down" size={16} className={`text-taupe-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="ml-[22px] grid gap-0.5 border-l-2 border-taupe-200 py-1 pl-3">
                    {g.children.map((c) => {
                      const active = g.children.filter((x) => isActive(pathname, x.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href === c.href;
                      return (
                        <Link key={c.href} href={c.href} onClick={onClose} aria-current={active ? 'page' : undefined}
                          className={`rounded-lg px-3 py-2 text-sm transition-colors ${active ? 'bg-taupe-900 font-bold text-white' : 'text-taupe-700 hover:bg-taupe-100'}`}>{c.label}</Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <a href="/" target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-taupe-100">
          <Chip icon="store" /><span className="text-[15px] font-medium">View store</span><I name="external" size={14} className="ml-auto text-taupe-600" />
        </a>
        <p className="px-3 pt-4 text-xs text-taupe-600">Aayash E-Mart · © {new Date().getFullYear()}</p>
      </aside>
    </>
  );
}
const Chip = ({ icon, on }) => <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${on ? 'bg-taupe-900 text-white' : 'bg-taupe-200/70 text-taupe-700'}`}><I name={icon} size={19} /></span>;
function Row({ href, icon, label, active, onClick }) {
  return (
    <Link href={href} onClick={onClick} aria-current={active ? 'page' : undefined} className={`flex items-center gap-3 rounded-xl px-2 py-2 ${active ? 'bg-taupe-100' : 'hover:bg-taupe-100'}`}>
      <Chip icon={icon} on={active} /><span className={`text-[15px] ${active ? 'font-bold text-taupe-900' : 'font-medium'}`}>{label}</span>
    </Link>
  );
}

export default function AdminShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState(null);
  const [open, setOpen] = useState(false);
  const [attention, setAttention] = useState(null);
  const logo = useLogo();

  useEffect(() => {
    let active = true;
    getSession().then((s) => { if (!active) return; if (s) setSession(s); else router.replace('/login'); }).catch(() => { if (active) router.replace('/login'); });
    return () => { active = false; };
  }, [router]);
  useEffect(() => setOpen(false), [pathname]);

  const permissions = session?.permissions;
  const can = useCallback((...codes) => !!permissions && (codes.length === 0 || codes.some((c) => permissions.includes(c))), [permissions]);
  const nav = useMemo(() => (session ? visibleNav(can) : []), [session, can]);
  const items = useMemo(() => flatItems(nav), [nav]);

  const refresh = useCallback(() => {
    if (!can('dashboard.view')) return;
    api('/ops/dashboard', { query: { range: 'today' } }).then((d) => setAttention(d.attention)).catch(() => {});
  }, [can]);
  useEffect(() => {
    if (!session) return undefined;
    refresh();
    const t = setInterval(refresh, 120000);
    return () => clearInterval(t);
  }, [session, refresh]);

  if (!session) return <div className="grid min-h-screen place-items-center bg-wash text-taupe-600">Loading…</div>;

  const signOut = async () => { try { await logout(); } finally { setSession(null); router.replace('/login'); router.refresh(); } };
  const quick = QUICK.filter((q) => can(...q.perm));
  const center = CENTER.map((href) => items.find((i) => i.href === href) || (href === '/admin' ? nav.find((g) => g.href === '/admin') : null)).filter(Boolean);
  const alerts = attention ? [
    { n: attention.newOrders, label: 'new orders to review', href: '/admin/orders?status=placed', show: can('orders.view', 'orders.manage') },
    { n: attention.incomplete, label: 'incomplete checkouts', href: '/admin/orders/incomplete', show: can('drafts.view', 'orders.manage') },
    { n: attention.lowStock, label: 'products low on stock', href: '/admin/stock/low', show: can('stock.view', 'products.view') },
    { n: attention.messages, label: 'unread messages', href: '/admin/messages', show: can('messages.manage') },
    { n: attention.reviews, label: 'reviews waiting for approval', href: '/admin/reviews', show: can('reviews.manage') },
    { n: attention.billsDue, label: 'bills due', href: '/admin/accounts/bills', show: can('accounts.view', 'accounts.manage') },
  ].filter((a) => a.show && a.n > 0) : [];
  const alertCount = alerts.reduce((s, a) => s + a.n, 0);

  return (
    <AdminCtx.Provider value={{ session, can, attention, refresh }}>
      <ToastProvider>
        <div className="min-h-screen bg-wash text-taupe-900">
          <header className="fixed inset-x-0 top-0 z-40 print:hidden flex h-14 items-center justify-between bg-white px-3 shadow-card">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-full text-taupe-700 hover:bg-taupe-100 lg:hidden" aria-label="Open menu"><I name="menu" /></button>
              <Link href="/admin" className="shrink-0"><img src={logo} alt="Aayash E-Mart" className="h-9 w-auto" /></Link>
              <div className="ml-1 hidden w-full max-w-[280px] sm:block"><SearchMenu items={items} /></div>
            </div>
            <nav aria-label="Shortcuts" className="hidden h-full items-stretch gap-1 lg:flex">
              {center.map((c) => {
                const active = isActive(pathname, c.href) && (c.href !== '/admin/orders' || !pathname.startsWith('/admin/orders/new'));
                return (
                  <Link key={c.href} href={c.href} title={c.label} aria-label={c.label} className={`relative grid w-24 place-items-center border-b-[3px] ${active ? 'border-primary text-primary-deep' : 'border-transparent text-taupe-600 hover:bg-taupe-100'} rounded-t-lg`}>
                    <I name={c.icon} size={24} />
                  </Link>
                );
              })}
            </nav>
            <div className="flex flex-1 items-center justify-end gap-2">
              {quick.length > 0 && (
                <Menu trigger={() => <button className="grid h-10 w-10 place-items-center rounded-full bg-taupe-100 hover:bg-taupe-200" aria-label="Create" title="Create"><I name="plus" /></button>}>
                  {quick.map((q) => <Link key={q.href} href={q.href} className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-taupe-50"><I name={q.icon} size={16} />{q.label}</Link>)}
                </Menu>
              )}
              <Menu trigger={() => (
                <button className="relative grid h-10 w-10 place-items-center rounded-full bg-taupe-100 hover:bg-taupe-200" aria-label={`Notifications${alertCount ? ` (${alertCount})` : ''}`}>
                  <I name="bell" />{alertCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[11px] font-bold leading-[18px] text-white">{alertCount > 99 ? '99+' : alertCount}</span>}
                </button>
              )}>
                <div className="w-72">
                  <p className="px-4 py-2.5 text-sm font-bold">Needs attention</p>
                  {alerts.length === 0 && <p className="px-4 pb-4 text-sm text-taupe-600">You&apos;re all caught up.</p>}
                  {alerts.map((a) => <Link key={a.href} href={a.href} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-taupe-50"><span className="grid h-7 min-w-[28px] place-items-center rounded-full bg-primary/20 px-1.5 text-xs font-bold text-primary-deep">{a.n}</span>{a.label}</Link>)}
                </div>
              </Menu>
              <Menu trigger={() => <button className="rounded-full" aria-label="Account menu"><Avatar name={session.name} size={40} /></button>}>
                <div className="border-b border-taupe-100 px-4 py-3"><p className="font-bold">{session.name}</p><p className="text-xs text-taupe-600">@{session.username}</p></div>
                <Link href="/admin/account" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-taupe-50"><I name="key" size={16} />Change password</Link>
                <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-taupe-50"><I name="store" size={16} />View store</a>
                <MenuItem icon="logout" danger onClick={signOut}>Sign out</MenuItem>
              </Menu>
            </div>
          </header>
          <Sidebar nav={nav} pathname={pathname} session={session} open={open} onClose={() => setOpen(false)} />
          <main className="px-4 pb-16 pt-[72px] sm:px-6 lg:ml-[300px] lg:px-8 print:m-0 print:p-0">
            <div className="mx-auto max-w-[1280px]">{children}</div>
          </main>
        </div>
      </ToastProvider>
    </AdminCtx.Provider>
  );
}
