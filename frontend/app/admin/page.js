'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useFetch } from '@/lib/admin-api';
import { taka, num, fmtDateTime } from '@/lib/format';
import { Alert, Card, PageHeader, SectionTitle, Spinner, Stat, StatusBadge, Tabs, I, Badge } from '@/components/admin/ui/kit';
import { ColumnChart, RankBars, fillDays } from '@/components/admin/ui/charts';
import { useAdmin } from '@/components/admin/AdminContext';

const RANGES = [{ value: 'today', label: 'Today' }, { value: 'yesterday', label: 'Yesterday' }, { value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }];
const METRICS = [{ value: 'value', label: 'Order value' }, { value: 'revenue', label: 'Collected' }, { value: 'orders', label: 'Orders' }];

export default function Dashboard() {
  const { can } = useAdmin();
  const [range, setRange] = useState('7');
  const [metric, setMetric] = useState('value');
  const { data, error, loading } = useFetch('/ops/dashboard', { range });
  const days = useMemo(() => data ? fillDays(data.daily, data.range.from, data.range.to, ['orders', 'value', 'revenue']).slice(-90) : [], [data]);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Spinner label="Loading dashboard…" />;
  const k = data.kpis;
  const metricLabel = METRICS.find((m) => m.value === metric).label;
  const net = data.income.total - data.expense.total;

  return (
    <div className={loading ? 'opacity-70 transition-opacity' : ''}>
      <PageHeader title="Dashboard" subtitle={`${data.range.from} → ${data.range.to}`} actions={<Tabs tabs={RANGES} value={range} onChange={setRange} />} />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Orders" value={num(k.orders)} sub={`${taka(k.booked)} booked`} icon="orders" href="/admin/orders" />
        <Stat label="Collected revenue" value={taka(k.revenue)} sub="Delivered orders" icon="trend" tone="green" />
        <Stat label="Average order" value={taka(k.averageOrder)} sub={`${num(k.newCustomers)} new customers`} icon="users" tone="blue" />
        <Stat label="Cash & bank" value={taka(k.cashBalance)} sub={can('accounts.view', 'accounts.manage') ? 'All active accounts' : ''} icon="wallet" tone="gray" href={can('accounts.view', 'accounts.manage') ? '/admin/accounts' : undefined} />
      </div>

      <Card className="mb-5">
        <SectionTitle right={<Tabs tabs={METRICS} value={metric} onChange={setMetric} />}>Sales over time</SectionTitle>
        <ColumnChart data={days} valueKey={metric} money={metric !== 'orders'} label={metricLabel} />
      </Card>

      <h2 className="mb-3 text-base font-bold">Orders by status</h2>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
        <Link href="/admin/orders" className="rounded-2xl bg-taupe-900 p-3.5 text-white shadow-card transition-shadow hover:shadow-pop">
          <p className="text-xs uppercase tracking-wide text-white/70">All orders</p><p className="text-2xl font-bold">{num(data.all.count)}</p><p className="text-xs text-white/70">{taka(data.all.amount)}</p>
        </Link>
        {data.tiles.map((t) => (
          <Link key={t.key} href={t.key === 'incomplete' ? '/admin/orders/incomplete' : `/admin/orders?status=${t.key}`} className="rounded-2xl bg-white p-3.5 shadow-card transition-shadow hover:shadow-pop">
            <p className="truncate text-xs uppercase tracking-wide text-taupe-600">{t.label}</p>
            <p className={`text-2xl font-bold ${t.count ? 'text-taupe-900' : 'text-taupe-300'}`}>{num(t.count)}</p>
            <p className="text-xs text-taupe-600">{taka(t.amount)}</p>
          </Link>
        ))}
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card><SectionTitle>Top products</SectionTitle><RankBars rows={data.topProducts.map((p) => ({ label: p.name, value: p.qty, sub: taka(p.amount) }))} format={(n) => `${num(n)} sold`} /></Card>
        <Card><SectionTitle>Order sources</SectionTitle><RankBars rows={data.sources.map((s) => ({ label: s.source || 'website', value: s.count, sub: taka(s.amount) }))} format={(n) => `${num(n)} orders`} /></Card>
        <Card>
          <SectionTitle>Needs attention</SectionTitle>
          <ul className="grid gap-2 text-sm">
            {[['New orders', data.attention.newOrders, '/admin/orders?status=placed'], ['Incomplete checkouts', data.attention.incomplete, '/admin/orders/incomplete'], ['Low stock', data.attention.lowStock, '/admin/stock/low'], ['Unread messages', data.attention.messages, '/admin/messages'], ['Reviews to approve', data.attention.reviews, '/admin/reviews'], ['Bills due in 7 days', data.attention.billsDue, '/admin/accounts/bills']].map(([l, n, href]) => (
              <li key={l}><Link href={href} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-taupe-50"><span>{l}</span><Badge tone={n ? 'orange' : 'gray'}>{n}</Badge></Link></li>
            ))}
          </ul>
        </Card>
      </div>

      {can('accounts.view', 'accounts.manage') && (
        <div className="mb-5 grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <SectionTitle>Money in vs out</SectionTitle>
            <div className="grid gap-3">
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3"><span className="flex items-center gap-2 text-sm text-emerald-800"><I name="arrowDown" size={16} />Income</span><b className="text-emerald-800">{taka(data.income.total)}</b></div>
              <div className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-3"><span className="flex items-center gap-2 text-sm text-red-800"><I name="arrowUp" size={16} />Expense</span><b className="text-red-800">{taka(data.expense.total)}</b></div>
              <div className="flex items-center justify-between rounded-xl bg-taupe-100 px-4 py-3"><span className="text-sm text-taupe-700">Net</span><b className={net < 0 ? 'text-danger' : 'text-taupe-900'}>{taka(net)}</b></div>
            </div>
          </Card>
          <Card><SectionTitle>Income by purpose</SectionTitle><RankBars rows={data.income.byPurpose.map((x) => ({ label: x.purpose, value: x.amount }))} format={taka} empty="No income recorded." /></Card>
          <Card><SectionTitle>Expense by purpose</SectionTitle><RankBars rows={data.expense.byPurpose.map((x) => ({ label: x.purpose, value: x.amount }))} format={taka} empty="No expenses recorded." /></Card>
        </div>
      )}

      <Card pad={false}>
        <div className="p-5 pb-2"><SectionTitle right={<Link href="/admin/orders" className="text-sm font-medium text-primary-deep hover:underline">View all</Link>}>Latest orders</SectionTitle></div>
        <div className="overflow-x-auto px-2 pb-3">
          <table className="w-full min-w-[560px] text-sm">
            <tbody>
              {data.recentOrders.map((o) => (
                <tr key={o.id} className="border-t border-taupe-50 hover:bg-taupe-50">
                  <td className="px-3 py-3"><Link href={`/admin/orders/${o.id}`} className="font-bold text-taupe-900 hover:underline">{o.order_no}</Link><p className="text-xs text-taupe-600">{o.guest_name}</p></td>
                  <td className="px-3 py-3 text-taupe-600">{fmtDateTime(o.created_at)}</td>
                  <td className="px-3 py-3 capitalize text-taupe-600">{o.source || 'website'}</td>
                  <td className="px-3 py-3 text-right font-bold">{taka(o.total)}</td>
                  <td className="px-3 py-3 text-right"><StatusBadge status={o.status} label={o.status_label} /></td>
                </tr>
              ))}
              {!data.recentOrders.length && <tr><td className="px-3 py-10 text-center text-taupe-600">No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
