import Link from 'next/link';

export default function Pill({ href, active = false, quiet = false, children }) {
  const state = active
    ? quiet ? 'border-tint bg-tint text-ink' : 'border-ink bg-ink text-white'
    : quiet ? 'border-transparent bg-transparent text-muted hover:text-ink' : 'border-line bg-white hover:border-primary';
  return <Link href={href} className={`rounded-full border px-3.5 py-2 text-sm font-medium ${state}`}>{children}</Link>;
}
