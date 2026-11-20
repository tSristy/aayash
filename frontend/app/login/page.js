'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Icon from '@/components/admin/Icon';
import { getSession, login } from '@/lib/auth';

const input = 'w-full rounded-xl border border-line bg-white px-4 py-3 text-ink placeholder:text-muted/60 focus:border-primary focus:outline-none';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (getSession()) router.replace('/admin'); }, [router]);

  const submit = (e) => {
    e.preventDefault();
    if (login(username, password)) router.replace('/admin');
    else setError('Incorrect username or password.');
  };

  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-6 py-10">
      <div className="w-full max-w-[400px]">
        <img src="/logo.png" alt="Aayash E-Mart" className="mx-auto mb-8 h-14 w-auto" />
        <form onSubmit={submit} className="grid gap-5 rounded-2xl border border-line bg-white p-8 shadow-[0_8px_30px_rgba(94,36,9,.06)]">
          <div>
            <h1 className="text-2xl text-brown">Admin sign in</h1>
            <p className="mt-1 text-sm text-muted">Enter your details to continue.</p>
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
                className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted hover:text-ink">
                <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </span>
          </label>

          {error && <p role="alert" className="-mt-2 text-sm text-danger">{error}</p>}

          <button className="rounded-xl bg-primary py-3 font-bold text-ink transition-colors hover:bg-primary-hover">Sign in</button>
        </form>
        <p className="mt-6 text-center text-sm text-muted"><Link href="/" className="hover:text-ink">← Back to store</Link></p>
      </div>
    </div>
  );
}
