const palette = [
  { stroke: 'stroke-primary', dot: 'bg-primary' },
  { stroke: 'stroke-taupe', dot: 'bg-taupe' },
  { stroke: 'stroke-taupe-700', dot: 'bg-taupe-700' },
  { stroke: 'stroke-primary-soft', dot: 'bg-primary-soft' },
  { stroke: 'stroke-taupe-300', dot: 'bg-taupe-300' },
];

export default function SalesDonut({ categories = [] }) {
  let offset = 0;
  const total = categories.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const rows = categories.map((item, index) => ({
    ...item,
    percent: total > 0 ? (Number(item.amount) / total) * 100 : 0,
    ...palette[index % palette.length],
  }));

  return (
    <section className="rounded-card border border-taupe-200 bg-white p-5">
      <h2 className="mb-4 text-lg">Top categories by delivered value</h2>
      {total === 0 ? (
        <p className="py-12 text-center text-sm text-taupe-600">No delivered orders yet.</p>
      ) : (
        <>
          <svg viewBox="0 0 42 42" className="mx-auto h-44 w-44 -rotate-90" role="img" aria-label="Delivered order value by category">
            <circle cx="21" cy="21" r="15.9155" fill="none" strokeWidth="5" className="stroke-taupe-100" />
            {rows.map((item) => {
              const current = offset;
              offset += item.percent;

              return (
                <circle
                  key={item.name}
                  cx="21"
                  cy="21"
                  r="15.9155"
                  fill="none"
                  strokeWidth="5"
                  className={item.stroke}
                  strokeDasharray={`${Math.max(0, item.percent - 0.1)} ${100 - item.percent + 0.1}`}
                  strokeDashoffset={-current}
                />
              );
            })}
          </svg>
          <ul className="mt-5 grid gap-2.5 text-sm">
            {rows.map((item) => (
              <li key={item.name} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
                  {item.name}
                </span>
                <strong>{item.percent.toFixed(1)}%</strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
