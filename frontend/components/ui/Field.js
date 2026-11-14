export const inputCls = 'w-full rounded-[10px] border border-line bg-white px-3 py-[11px] font-normal focus:border-primary focus:outline-none';

export default function Field({ label, children }) {
  return <label className="grid gap-1.5 text-sm font-bold">{label}{children}</label>;
}
