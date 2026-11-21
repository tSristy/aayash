import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';

export const metadata = {
  title: 'Admin – Aayash E-Mart',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }) {
  const raw = cookies().get('ayashmart_admin_sid')?.value;
  if (!raw || !/^[0-9a-f]{64}$/.test(raw)) redirect('/login');
  const backend = (process.env.AYASHMART_BACKEND_INTERNAL_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');
  try {
    const response = await fetch(`${backend}/api/admin/auth/me`, {
      headers: { Cookie: `ayashmart_admin_sid=${raw}` },
      cache: 'no-store',
    });
    if (!response.ok) redirect('/login');
  } catch (error) {
    // Next.js redirect throws an internal exception; propagate it rather than
    // treating a legitimate redirect as a network failure.
    if (error?.digest?.startsWith('NEXT_REDIRECT')) throw error;
    redirect('/login');
  }
  return <AdminShell>{children}</AdminShell>;
}
