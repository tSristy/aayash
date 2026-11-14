export default function Stepper({ value, onChange, max = 99 }) {
  const btn = 'h-10 w-10 text-xl';
  return (
    <div className="inline-flex items-center rounded-xl border border-line bg-white">
      <button type="button" className={btn} onClick={() => onChange(Math.max(1, value - 1))} aria-label="Decrease quantity">−</button>
      <span className="min-w-9 text-center font-bold" aria-live="polite">{value}</span>
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} aria-label="Increase quantity">+</button>
    </div>
  );
}
