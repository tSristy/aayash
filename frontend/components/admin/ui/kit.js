'use client';

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import I from './Icons';

/* ---------- surfaces ---------- */
export const Card = ({ children, className = '', pad = true, ...rest }) => (
  <section className={`rounded-2xl bg-white shadow-card ${pad ? 'p-5' : ''} ${className}`} {...rest}>{children}</section>
);

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back}
        <h1 className="text-2xl font-bold text-taupe-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-taupe-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export const SectionTitle = ({ children, right }) => (
  <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-base font-bold text-taupe-900">{children}</h2>{right}</div>
);

/* ---------- buttons ---------- */
const BTN = {
  primary: 'bg-taupe-900 text-white hover:bg-taupe-800',
  soft: 'bg-taupe-100 text-taupe-800 hover:bg-taupe-200',
  outline: 'border border-taupe-200 bg-white text-taupe-700 hover:bg-taupe-50',
  danger: 'bg-red-50 text-danger hover:bg-red-100',
  dark: 'bg-taupe-900 text-white hover:bg-taupe-800',
  ghost: 'text-taupe-700 hover:bg-taupe-100',
};
export function Btn({ variant = 'primary', size = 'md', icon, children, className = '', loading, disabled, type = 'button', ...rest }) {
  const sz = size === 'sm' ? 'px-3 py-1.5 text-xs gap-1.5' : size === 'lg' ? 'px-6 py-3 text-base gap-2' : 'px-4 py-2 text-sm gap-2';
  return (
    <button type={type} disabled={disabled || loading} className={`inline-flex items-center justify-center rounded-xl font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${sz} ${BTN[variant]} ${className}`} {...rest}>
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icon && <I name={icon} size={size === 'sm' ? 15 : 17} />}
      {children}
    </button>
  );
}
export const IconBtn = ({ icon, label, variant = 'ghost', className = '', size = 18, ...rest }) => (
  <button type="button" aria-label={label} title={label} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors disabled:opacity-50 ${BTN[variant]} ${className}`} {...rest}><I name={icon} size={size} /></button>
);

/* ---------- form fields ---------- */
export const inputCls = 'w-full rounded-xl border border-taupe-200 bg-white px-3 py-2.5 text-sm text-taupe-900 placeholder:text-taupe-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:bg-taupe-50 disabled:text-taupe-600';

export function Field({ label, help, error, required, children, className = '' }) {
  const id = useId();
  return (
    <div className={`grid content-start gap-1.5 ${className}`}>
      {label && <label htmlFor={id} className="text-sm font-medium text-taupe-700">{label}{required && <span className="text-danger"> *</span>}</label>}
      {children(id)}
      {help && !error && <p className="text-xs text-taupe-600">{help}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
export const Input = ({ label, help, error, required, className, wrap = '', ...rest }) => (
  <Field label={label} help={help} error={error} required={required} className={wrap}>{(id) => <input id={id} className={`${inputCls} ${className || ''}`} {...rest} />}</Field>
);
export const Textarea = ({ label, help, error, required, rows = 4, wrap = '', className = '', ...rest }) => (
  <Field label={label} help={help} error={error} required={required} className={wrap}>{(id) => <textarea id={id} rows={rows} className={`${inputCls} ${className}`} {...rest} />}</Field>
);
export const Select = ({ label, help, error, required, options = [], placeholder, wrap = '', className = '', ...rest }) => (
  <Field label={label} help={help} error={error} required={required} className={wrap}>
    {(id) => (
      <select id={id} className={`${inputCls} ${className}`} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    )}
  </Field>
);
export function Toggle({ checked, onChange, label, help, disabled }) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <button type="button" role="switch" aria-checked={!!checked} disabled={disabled} onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-taupe-300'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
      <span className="text-sm text-taupe-800">{label}{help && <span className="block text-xs text-taupe-600">{help}</span>}</span>
    </label>
  );
}
export function SearchBox({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <I name="search" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        className="w-full rounded-full border border-transparent bg-taupe-100 py-2 pl-10 pr-4 text-sm placeholder:text-taupe-600 focus:border-primary focus:bg-white focus:outline-none" />
    </div>
  );
}

/* ---------- badges, tabs ---------- */
const TONES = {
  gray: 'bg-taupe-100 text-taupe-700', orange: 'bg-primary/15 text-primary-deep', green: 'bg-emerald-50 text-emerald-700',
  red: 'bg-red-50 text-red-700', blue: 'bg-sky-50 text-sky-700', purple: 'bg-violet-50 text-violet-700', amber: 'bg-amber-50 text-amber-700',
};
export const Badge = ({ tone = 'gray', children, className = '' }) => <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}>{children}</span>;

export const STATUS_TONE = {
  incomplete: 'gray', placed: 'amber', pending: 'amber', confirmed: 'blue', wfp: 'purple', packaging: 'blue', packed: 'blue', out_for_delivery: 'purple',
  partial_delivered: 'orange', delivered: 'green', return_pending: 'red', returned: 'red', cancelled: 'red', paid: 'green', unpaid: 'amber', refunded: 'red',
  approved: 'green', hidden: 'gray', active: 'green', inactive: 'gray',
};
export const StatusBadge = ({ status, label }) => <Badge tone={STATUS_TONE[status] || 'gray'}>{label || String(status || '').replace(/_/g, ' ')}</Badge>;

export function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div role="tablist" className={`flex gap-1 overflow-x-auto pb-1 ${className}`}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button key={t.value} role="tab" aria-selected={active} onClick={() => onChange(t.value)}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${active ? 'bg-taupe-900 text-white' : 'bg-white text-taupe-700 shadow-card hover:bg-taupe-100'}`}>
            {t.label}
            {t.count !== undefined && t.count !== null && <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-white/20' : 'bg-taupe-100 text-taupe-600'}`}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- toast ---------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setItems((list) => [...list, { id, message, tone }]);
    setTimeout(() => setItems((list) => list.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[100] grid -translate-x-1/2 gap-2" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`pointer-events-auto flex max-w-[92vw] items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-pop ${t.tone === 'error' ? 'bg-red-600 text-white' : 'bg-taupe-900 text-white'}`}>
            <I name={t.tone === 'error' ? 'alert' : 'check'} size={16} />{t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- modal / drawer / confirm ---------- */
function useEscape(onClose) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = prev; };
  }, [onClose]);
}
export function Modal({ title, onClose, children, footer, width = 'max-w-xl' }) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-taupe-900/45 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`my-8 w-full ${width} rounded-2xl bg-white shadow-pop`}>
        <div className="flex items-center justify-between border-b border-taupe-100 px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <IconBtn icon="x" label="Close" onClick={onClose} variant="soft" />
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-taupe-100 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
export function Drawer({ title, onClose, children, width = 'max-w-2xl', actions }) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-50 bg-taupe-900/45" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-label={title} className={`absolute inset-y-0 right-0 flex w-full ${width} flex-col bg-wash shadow-pop`}>
        <div className="flex items-center justify-between gap-2 border-b border-taupe-200 bg-white px-5 py-4">
          <h2 className="min-w-0 truncate text-lg font-bold">{title}</h2>
          <div className="flex items-center gap-2">{actions}<IconBtn icon="x" label="Close" onClick={onClose} variant="soft" /></div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  );
}
export function useConfirm() {
  const [state, setState] = useState(null);
  const ask = useCallback((opts) => new Promise((resolve) => setState({ ...opts, resolve })), []);
  const close = (v) => { state?.resolve(v); setState(null); };
  const node = state && (
    <Modal title={state.title || 'Are you sure?'} onClose={() => close(false)} width="max-w-md"
      footer={<><Btn variant="outline" onClick={() => close(false)}>Cancel</Btn><Btn variant={state.danger === false ? 'primary' : 'danger'} onClick={() => close(true)}>{state.confirmLabel || 'Confirm'}</Btn></>}>
      <p className="text-sm text-taupe-700">{state.message}</p>
    </Modal>
  );
  return [ask, node];
}

/* ---------- tables ---------- */
export function Table({ columns, rows, loading, empty = 'Nothing here yet.', onRowClick, rowKey = 'id', dense }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-taupe-100 text-xs uppercase tracking-wide text-taupe-600">
            {columns.map((c) => <th key={c.key || c.label} className={`px-3 py-2.5 font-medium ${c.align === 'right' ? 'text-right' : ''} ${c.className || ''}`}>{c.header ?? c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {loading && !rows?.length && Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="border-b border-taupe-50">{columns.map((c, j) => <td key={j} className="px-3 py-3"><div className="h-4 animate-pulse rounded bg-taupe-100" /></td>)}</tr>
          ))}
          {!loading && !rows?.length && <tr><td colSpan={columns.length} className="px-3 py-12 text-center text-taupe-600">{empty}</td></tr>}
          {rows?.map((row, i) => (
            <tr key={row[rowKey] ?? i} onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-taupe-50 last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-taupe-50' : ''} ${loading ? 'opacity-60' : ''}`}>
              {columns.map((c) => (
                <td key={c.key || c.label} className={`px-3 ${dense ? 'py-2' : 'py-3'} align-middle ${c.align === 'right' ? 'text-right' : ''} ${c.className || ''}`}>
                  {c.render ? c.render(row) : (row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Pagination({ page, totalPages, total, onPage, label = 'results' }) {
  if (!total) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-taupe-100 px-3 pt-3 text-sm text-taupe-600">
      <span>{total.toLocaleString()} {label}</span>
      <div className="flex items-center gap-1">
        <IconBtn icon="left" label="Previous page" variant="soft" disabled={page <= 1} onClick={() => onPage(page - 1)} />
        <span className="px-2">Page {page} of {totalPages}</span>
        <IconBtn icon="right" label="Next page" variant="soft" disabled={page >= totalPages} onClick={() => onPage(page + 1)} />
      </div>
    </div>
  );
}

/* ---------- misc ---------- */
export const Alert = ({ tone = 'error', children }) => children ? (
  <div role="alert" className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${tone === 'error' ? 'bg-red-50 text-red-800' : tone === 'warn' ? 'bg-amber-50 text-amber-900' : tone === 'info' ? 'bg-sky-50 text-sky-900' : 'bg-emerald-50 text-emerald-800'}`}>
    <I name={tone === 'success' ? 'check' : 'alert'} size={17} className="mt-0.5" /><div>{children}</div>
  </div>
) : null;

export const Empty = ({ icon = 'box', title, text, action }) => (
  <div className="grid place-items-center px-6 py-14 text-center">
    <span className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary-deep"><I name={icon} size={26} /></span>
    <p className="font-bold">{title}</p>{text && <p className="mt-1 max-w-sm text-sm text-taupe-600">{text}</p>}{action && <div className="mt-4">{action}</div>}
  </div>
);

export const Spinner = ({ label = 'Loading…' }) => <div className="flex items-center justify-center gap-3 py-16 text-sm text-taupe-600"><span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />{label}</div>;

export function Stat({ label, value, sub, icon, tone = 'orange', href }) {
  const body = (
    <div className="flex items-center gap-3">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${tone === 'green' ? 'bg-emerald-50 text-emerald-700' : tone === 'red' ? 'bg-red-50 text-red-700' : tone === 'blue' ? 'bg-sky-50 text-sky-700' : tone === 'gray' ? 'bg-taupe-100 text-taupe-700' : 'bg-primary/15 text-primary-deep'}`}><I name={icon || 'chart'} size={21} /></span>
      <div className="min-w-0"><p className="truncate text-xs font-medium uppercase tracking-wide text-taupe-600">{label}</p><p className="truncate text-xl font-bold leading-tight text-taupe-900">{value}</p>{sub && <p className="truncate text-xs text-taupe-600">{sub}</p>}</div>
    </div>
  );
  return href ? <a href={href} className="block rounded-2xl bg-white p-4 shadow-card transition-shadow hover:shadow-pop">{body}</a> : <div className="rounded-2xl bg-white p-4 shadow-card">{body}</div>;
}

export function Dl({ items, cols = 2 }) {
  return (
    <dl className={`grid gap-x-6 gap-y-3 text-sm ${cols === 2 ? 'sm:grid-cols-2' : cols === 3 ? 'sm:grid-cols-3' : ''}`}>
      {items.filter(Boolean).map(([k, v]) => <div key={k}><dt className="text-xs uppercase tracking-wide text-taupe-600">{k}</dt><dd className="mt-0.5 break-words font-medium text-taupe-900">{v ?? '—'}</dd></div>)}
    </dl>
  );
}

export function useLocal(key, initial) {
  const [v, setV] = useState(initial);
  useEffect(() => { try { const s = localStorage.getItem(key); if (s) setV(JSON.parse(s)); } catch { /* storage unavailable */ } }, [key]);
  const set = useCallback((n) => { setV(n); try { localStorage.setItem(key, JSON.stringify(n)); } catch { /* storage unavailable */ } }, [key]);
  return [v, set];
}

export function useForm(initial) {
  const [values, setValues] = useState(initial);
  const set = useCallback((name, value) => setValues((v) => ({ ...v, [name]: value })), []);
  const bind = (name) => ({ value: values[name] ?? '', onChange: (e) => set(name, e.target.value) });
  return { values, setValues, set, bind };
}

export function Menu({ trigger, children, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const k = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', h); document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, []);
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger(open)}</div>
      {open && <div role="menu" onClick={() => setOpen(false)} className={`absolute top-full z-40 mt-2 min-w-[200px] overflow-hidden rounded-xl bg-white py-1 shadow-pop ${align === 'right' ? 'right-0' : 'left-0'}`}>{children}</div>}
    </div>
  );
}
export const MenuItem = ({ icon, children, danger, ...rest }) => (
  <button role="menuitem" type="button" className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-taupe-50 ${danger ? 'text-danger' : 'text-taupe-800'}`} {...rest}>{icon && <I name={icon} size={16} />}{children}</button>
);

export { I };
export const useMemoArr = useMemo;
