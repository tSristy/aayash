import { ZONES } from './data';

export default function DeliveryProgress() {
  return (
    <section className="rounded-card border border-line bg-white p-5">
      <h2 className="mb-4 text-lg">Delivery progress</h2>
      <div className="grid gap-4">
        {ZONES.map((z) => {
          const pct = Math.round((z.done / z.total) * 100);
          return (
            <div key={z.name}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium">{z.name}</span>
                <span className="text-muted">{z.done}/{z.total} · {pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-tint-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${z.name} deliveries`}>
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
