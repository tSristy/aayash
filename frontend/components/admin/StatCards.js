import Icon from './Icon';
import { STATS } from './data';

export default function StatCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {STATS.map((s) => (
        <div key={s.label} className="flex items-start justify-between rounded-card border border-taupe-200 bg-white p-5">
          <div>
            <p className="text-sm text-taupe-600">{s.label}</p>
            <p className="mt-1 font-display text-[28px] font-extrabold leading-tight">{s.value}</p>
            <p className={`mt-1 text-xs font-medium ${s.up ? 'text-success' : 'text-danger'}`}>{s.up ? '↑ ' : ''}{s.delta}</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary-deep"><Icon name={s.icon} /></span>
        </div>
      ))}
    </div>
  );
}
