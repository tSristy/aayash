'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Icon from '@/components/admin/Icon';
import { getSession, login } from '@/lib/auth';

const input = 'w-full rounded-xl border border-taupe-200 bg-white px-4 py-3 text-taupe-900 placeholder:text-taupe/70 focus:border-primary focus:outline-none';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    getSession().then((s) => { if (active && s) router.replace('/admin'); });
    return () => { active = false; };
  }, [router]);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await login(username, password);
      router.replace('/admin');
      router.refresh();
    } catch (err) { setError(err.message || 'Sign in failed.'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-wash px-6 py-10">
      <div className="w-full max-w-[400px]">
        <img src="/logo.png" alt="Aayash E-Mart" className="mx-auto mb-8 h-14 w-auto" />
        <form onSubmit={submit} className="grid gap-5 rounded-2xl border border-taupe-200 bg-white p-8 shadow-[0_8px_30px_rgba(43,40,35,.06)]">
          <div>
            <h1 className="text-2xl text-taupe-900">Admin sign in</h1>
            <p className="mt-1 text-sm text-taupe-600">Enter your details to continue.</p>
          </div>

          <label className="grid gap-1.5 text-sm font-bold">
            Username
            <input className={`${input} font-normal`} value={username} onChange={(e) => { setUsername(e.target.value); setError(''); }}
              autoComplete="username" autoFocus required />
          </label>

          <label className="grid gap-1.5 text-sm font-bold">
            Password
            <span className="relative">
              <input className={`${input} pr-12 font-normal`} type={show ? 'text' : 'password'} value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }} autoComplete="current-password" required />
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 grid w-12 place-items-center text-taupe-600 hover:text-taupe-900">
                <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </span>
          </label>

          {error && <p role="alert" className="-mt-2 text-sm text-danger">{error}</p>}

          <button className="rounded-xl bg-primary py-3 font-bold text-taupe-900 transition-colors hover:bg-primary-hover" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="mt-6 text-center text-sm text-taupe-600"><Link href="/" className="hover:text-taupe-900">← Back to store</Link></p>
      </div>
    </div>
  );
}
