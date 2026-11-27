export const money = (n) => '৳' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
export const INSIDE_DHAKA_DELIVERY_FEE = 70;
export const OUTSIDE_DHAKA_DELIVERY_FEE = 120;

/** Money with paisa where needed: ৳1,250 or ৳1,250.50 */
export const taka = (n) => {
  const v = Number(n) || 0;
  return '৳' + v.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
};
const asDate = (v) => (v instanceof Date ? v : new Date(String(v).includes('T') || String(v).length > 10 ? v : `${v}T00:00:00`));
export const fmtDate = (v) => (v ? asDate(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (v) => (v ? asDate(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : '—');
export const num = (n) => Number(n || 0).toLocaleString('en-US');
export const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const readable = (s) => String(s || '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
