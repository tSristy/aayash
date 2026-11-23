const statuses = [
  { key: 'placed', label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'packed', label: 'Packed' },
  { key: 'out_for_delivery', label: 'Out for delivery' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function DeliveryProgress({ counts = [] }) {
  const byStatus = Object.fromEntries(counts.map((item) => [item.status, item.total]));
  const total = statuses.reduce((sum, item) => sum + Number(byStatus[item.key] || 0), 0);

  return (
    <section className="rounded-card border border-taupe-200 bg-white p-5">
      <h2 className="mb-4 text-lg">Order status distribution</h2>
      <div className="grid gap-4">
        {statuses.map((item) => {
          const count = Number(byStatus[item.key] || 0);
          const percent = total ? Math.round((count / total) * 100) : 0;

          return (
            <div key={item.key}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="font-medium">{item.label}</span>
                <span className="text-taupe-600">{count} · {percent}%</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-taupe-100"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.label} orders`}
              >
                <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
