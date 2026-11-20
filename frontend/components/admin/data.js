// SAMPLE DATA for the dashboard layout. Replace with API calls once admin endpoints exist.
export const STATS = [
  { label: 'Total revenue', value: '৳458,200', delta: '+12.4% this week', up: true, icon: 'money' },
  { label: 'Orders', value: '1,284', delta: '+8.1% this week', up: true, icon: 'orders' },
  { label: 'Customers', value: '3,562', delta: '+5.7% this week', up: true, icon: 'customers' },
  { label: 'Low stock items', value: '7', delta: 'Needs restocking', up: false, icon: 'alert' },
];

export const ORDERS = [
  { id: 'AEM-1048', customer: 'Nusrat Jahan', items: 'Chinigura Rice 5 kg, +2 more', date: 'Nov 20', amount: 1240, status: 'placed' },
  { id: 'AEM-1047', customer: 'Rafiq Ahmed', items: 'Broiler Chicken 2 kg', date: 'Nov 20', amount: 520, status: 'out_for_delivery' },
  { id: 'AEM-1046', customer: 'Tania Hossain', items: 'Farm Eggs 30 pcs, +1 more', date: 'Nov 19', amount: 475, status: 'delivered' },
  { id: 'AEM-1045', customer: 'Imran Khan', items: 'Rohu Fish 1 kg', date: 'Nov 19', amount: 480, status: 'delivered' },
  { id: 'AEM-1044', customer: 'Sadia Rahman', items: 'Fuji Apple 2 kg, +3 more', date: 'Nov 19', amount: 1860, status: 'confirmed' },
  { id: 'AEM-1043', customer: 'Mahin Sarker', items: 'Soybean Oil 5 L', date: 'Nov 18', amount: 980, status: 'cancelled' },
  { id: 'AEM-1042', customer: 'Farhana Akter', items: 'Full Cream Milk 1 L, +2 more', date: 'Nov 18', amount: 390, status: 'delivered' },
  { id: 'AEM-1041', customer: 'Jahid Hasan', items: 'Beef, Bone-in 1 kg', date: 'Nov 18', amount: 850, status: 'delivered' },
];

// Tailwind only generates classes it can see as whole strings, so each class name is written out in full.
export const STATUS = {
  placed: { label: 'Placed', cls: 'bg-taupe-100 text-taupe-700' },
  confirmed: { label: 'Confirmed', cls: 'bg-primary/15 text-primary-deep' },
  out_for_delivery: { label: 'Out for delivery', cls: 'bg-primary text-taupe-900' },
  delivered: { label: 'Delivered', cls: 'bg-success/10 text-success' },
  cancelled: { label: 'Cancelled', cls: 'bg-danger/10 text-danger' },
};

export const CATEGORY_SALES = [
  { name: 'Fruits & Vegetables', pct: 32, stroke: 'stroke-primary', dot: 'bg-primary' },
  { name: 'Meat & Fish', pct: 24, stroke: 'stroke-taupe', dot: 'bg-taupe' },
  { name: 'Dairy & Eggs', pct: 18, stroke: 'stroke-taupe-700', dot: 'bg-taupe-700' },
  { name: 'Rice, Oil & Pulses', pct: 14, stroke: 'stroke-primary-soft', dot: 'bg-primary-soft' },
  { name: 'Other', pct: 12, stroke: 'stroke-taupe-300', dot: 'bg-taupe-300' },
];

export const ZONES = [
  { name: 'Dhanmondi', done: 42, total: 50 },
  { name: 'Gulshan', done: 31, total: 52 },
  { name: 'Mirpur', done: 18, total: 40 },
  { name: 'Uttara', done: 9, total: 33 },
];
