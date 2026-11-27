import Link from 'next/link';

export default function Pill({ href, active = false, children }) {
  return <Link href={href} className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm ${active ? 'border-brown bg-brown text-white' : 'border-line bg-white text-ink hover:border-ink'}`}>{children}</Link>;
}
