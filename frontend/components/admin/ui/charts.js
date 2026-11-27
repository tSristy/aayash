'use client';

import { useMemo, useState } from 'react';
import { taka, num } from '@/lib/format';

/** Fill missing days so the x axis is continuous. */
export function fillDays(rows, from, to, keys) {
  const map = new Map(rows.map((r) => [String(r.day).slice(0, 10), r]));
  const out = [];
  const d = new Date(`${from}T00:00:00`); const end = new Date(`${to}T00:00:00`);
  for (let i = 0; d <= end && i < 400; i += 1, d.setDate(d.getDate() + 1)) {
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({ day: k, ...Object.fromEntries(keys.map((x) => [x, 0])), ...(map.get(k) || {}) });
  }
  return out;
}

const niceMax = (v) => {
  if (v <= 0) return 10;
  const p = 10 ** Math.floor(Math.log10(v)); const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
};
const short = (n) => (n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}k` : String(n));

/** Single-series column chart with hover tooltip, light grid, rounded data ends. */
export function ColumnChart({ data, valueKey, money = true, height = 240, label }) {
  const [hover, setHover] = useState(null);
  const W = 720; const H = height; const L = 44; const B = 26; const T = 10; const R = 8;
  const max = useMemo(() => niceMax(Math.max(0, ...data.map((d) => d[valueKey] || 0))), [data, valueKey]);
  const bw = (W - L - R) / Math.max(1, data.length);
  const barW = Math.max(3, Math.min(28, bw - 2 - (data.length > 40 ? 0 : 2)));
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const every = Math.ceil(data.length / 8);
  const total = data.reduce((s, d) => s + (d[valueKey] || 0), 0);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${label}: total ${money ? taka(total) : num(total)}`} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#E2E8F0" strokeWidth="1" />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#475569">{short(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const v = d[valueKey] || 0;
          const x = L + i * bw + (bw - barW) / 2;
          const top = y(v);
          const h = Math.max(v > 0 ? 2 : 0, H - B - top);
          const r = Math.min(4, barW / 2, h);
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${d.day}: ${money ? taka(v) : v}`}>
              <rect x={L + i * bw} y={T} width={bw} height={H - T - B} fill="transparent" />
              {v > 0 && <path d={`M${x},${H - B} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${H - B} Z`} fill={hover === i ? '#2563EB' : '#0F172A'} />}
              {i % every === 0 && <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#475569">{d.day.slice(8)}/{d.day.slice(5, 7)}</text>}
            </g>
          );
        })}
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="#CBD5E1" />
      </svg>
      {hover !== null && data[hover] && (
        <div className="pointer-events-none absolute top-1 rounded-lg bg-taupe-900 px-3 py-2 text-xs text-white shadow-pop" style={{ left: `${Math.min(78, Math.max(2, ((L + hover * bw) / W) * 100))}%` }}>
          <p className="font-medium">{new Date(`${data[hover].day}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          <p>{label}: <b>{money ? taka(data[hover][valueKey]) : num(data[hover][valueKey])}</b></p>
        </div>
      )}
    </div>
  );
}

/** Ranked horizontal bars: label, bar, value. One hue; the bar length carries the data. */
export function RankBars({ rows, valueKey = 'value', labelKey = 'label', format = num, empty = 'No data in this period.' }) {
  const max = Math.max(1, ...rows.map((r) => r[valueKey]));
  if (!rows.length) return <p className="py-8 text-center text-sm text-taupe-600">{empty}</p>;
  return (
    <ul className="grid gap-3">
      {rows.map((r) => (
        <li key={r[labelKey]} className="grid gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm"><span className="truncate text-taupe-800">{r[labelKey]}</span><span className="shrink-0 font-bold">{format(r[valueKey])}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-taupe-100"><div className="h-full rounded-full bg-taupe-900" style={{ width: `${Math.max(2, (r[valueKey] / max) * 100)}%` }} /></div>
          {r.sub && <p className="text-xs text-taupe-600">{r.sub}</p>}
        </li>
      ))}
    </ul>
  );
}

/** Tiny trend line for tiles. */
export function Spark({ values, width = 90, height = 28 }) {
  const max = Math.max(1, ...values); const n = values.length;
  if (n < 2) return null;
  const pts = values.map((v, i) => `${(i / (n - 1)) * width},${height - 3 - (v / max) * (height - 6)}`).join(' ');
  return <svg width={width} height={height} aria-hidden="true"><polyline points={pts} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}
