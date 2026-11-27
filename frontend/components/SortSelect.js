'use client';
import { useRouter } from 'next/navigation';

export default function SortSelect({ value, options, hrefs }) {
  const router = useRouter();
  return (
    <select value={value} onChange={(e) => router.push(hrefs[e.target.value])} aria-label="Sort products"
      className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brown focus:outline-none">
      {options.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
    </select>
  );
}
