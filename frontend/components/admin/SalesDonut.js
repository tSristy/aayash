import { CATEGORY_SALES } from './data';

export default function SalesDonut() {
  let offset = 0;
  return (
    <section className="rounded-card border border-taupe-200 bg-white p-5">
      <h2 className="mb-4 text-lg">Sales by category</h2>
      <svg viewBox="0 0 42 42" className="mx-auto h-44 w-44 -rotate-90" role="img" aria-label="Sales by category">
        <circle cx="21" cy="21" r="15.9155" fill="none" strokeWidth="5" className="stroke-taupe-100" />
        {CATEGORY_SALES.map((c) => {
          const el = (
            <circle key={c.name} cx="21" cy="21" r="15.9155" fill="none" strokeWidth="5" className={c.stroke}
              strokeDasharray={`${c.pct - 0.6} ${100 - c.pct + 0.6}`} strokeDashoffset={-offset} />
          );
          offset += c.pct;
          return el;
        })}
      </svg>
      <ul className="mt-5 grid gap-2.5 text-sm">
        {CATEGORY_SALES.map((c) => (
          <li key={c.name} className="flex items-center justify-between">
            <span className="flex items-center gap-2.5"><span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />{c.name}</span>
            <strong>{c.pct}%</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
