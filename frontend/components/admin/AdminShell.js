'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { getSession, logout } from '@/lib/auth';

// Client-side gate: without a session the visitor is sent to /login.
export default function AdminShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (s) setSession(s); else router.replace('/login');
  }, [router]);
  useEffect(() => setOpen(false), [pathname]);

  if (!session) return <div className="grid min-h-screen place-items-center bg-taupe-50 text-taupe-600">Loading…</div>;

  const signOut = () => { logout(); router.replace('/login'); };

  return (
    <div className="min-h-screen bg-wash text-taupe-900 lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-col">
        <Topbar session={session} onMenu={() => setOpen(true)} onSignOut={signOut} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
