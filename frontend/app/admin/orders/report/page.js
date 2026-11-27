'use client';
import { useState } from 'react';
import { useFetch } from '@/lib/admin-api';
import { taka, num, todayStr } from '@/lib/format';
import { Alert, Card, PageHeader, SectionTitle, Spinner, Table } from '@/components/admin/ui/kit';
import { ColumnChart, fillDays } from '@/components/admin/ui/charts';

const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function Report() {
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(todayStr());
  const { data, error, loading } = useFetch('/orders/processing-report', { from, to });
  const cols = [{ label: 'Staff', render: (r) => <b>{r.staff}</b> }, ...['confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled', 'returned'].map((k) => ({ label: data?.statuses?.[k] || k, align: 'right', render: (r) => num(r[k] || 0) })), { label: 'Total actions', align: 'right', render: (r) => <b>{num(r.total)}</b> }];
  return (
    <>
      <PageHeader title="Order processing report" subtitle="How many status changes each team member made." actions={<div className="flex items-center gap-2 text-sm"><input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="rounded-full bg-white px-3 py-1.5 shadow-card" aria-label="From" /><span>→</span><input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="rounded-full bg-white px-3 py-1.5 shadow-card" aria-label="To" /></div>} />
      {error && <Alert>{error}</Alert>}
      {!data ? <Spinner /> : (
        <div className={`grid gap-5 ${loading ? 'opacity-70' : ''}`}>
          <Card><SectionTitle>Orders placed per day</SectionTitle><ColumnChart data={fillDays(data.daily, data.from, data.to, ['orders', 'value'])} valueKey="orders" money={false} label="Orders" /></Card>
          <Card pad={false}><div className="p-5 pb-0"><SectionTitle>By team member</SectionTitle></div><div className="px-2 pb-3"><Table rows={data.staff.map((s, i) => ({ ...s, id: i }))} columns={cols} empty="No activity in this period." /></div></Card>
        </div>
      )}
    </>
  );
}
