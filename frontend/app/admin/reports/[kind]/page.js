'use client';
import { notFound, useParams } from 'next/navigation';
import { useState } from 'react';
import { useFetch } from '@/lib/admin-api';
import { taka, num } from '@/lib/format';
import { Alert, Card, PageHeader, SectionTitle, Spinner, Stat, Table, Tabs, Btn } from '@/components/admin/ui/kit';
import { ColumnChart, RankBars, fillDays } from '@/components/admin/ui/charts';
import { downloadCsv } from '@/components/admin/ui/csv';

const RANGES = [{ value: 'today', label: 'Today' }, { value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }, { value: 'all', label: 'All time' }];
const TITLES = { sales: ['Sales report', 'Revenue, cost and profit from delivered orders.'], 'profit-loss': ['Profit & loss', 'What the shop earned after cost of goods and expenses.'], stock: ['Stock value report', 'Opening, in, sold, damaged and closing units.'], couriers: ['Courier report', 'How each courier performed.'] };
const ENDPOINT = { sales: '/ops/reports/sales', 'profit-loss': '/ops/reports/profit-loss', stock: '/ops/reports/stock', couriers: '/ops/reports/couriers' };

function Sales({ range }) {
  const [group, setGroup] = useState('day');
  const { data, error } = useFetch(ENDPOINT.sales, { range, group });
  if (error) return <Alert>{error}</Alert>; if (!data) return <Spinner />;
  const rows = data.items.map((r, i) => ({ ...r, id: i }));
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Revenue" value={taka(data.totals.revenue)} icon="trend" tone="green" /><Stat label="Cost of goods" value={taka(data.totals.cost)} icon="box" tone="gray" /><Stat label="Gross profit" value={taka(data.totals.profit)} sub={data.totals.revenue ? `${((data.totals.profit / data.totals.revenue) * 100).toFixed(1)}% margin` : ''} icon="wallet" /><Stat label="Units sold" value={num(data.totals.qty)} sub={`${num(data.totals.orders)} orders`} icon="cart" tone="blue" /></div>
      <Tabs value={group} onChange={setGroup} tabs={[{ value: 'day', label: 'By day' }, { value: 'month', label: 'By month' }, { value: 'product', label: 'By product' }, { value: 'category', label: 'By category' }, { value: 'source', label: 'By source' }]} />
      {group === 'day' && rows.length > 1 && <Card><SectionTitle>Revenue per day</SectionTitle><ColumnChart data={fillDays(data.items.map((r) => ({ day: r.label, revenue: r.revenue })), data.items[0].label, data.items[data.items.length - 1].label, ['revenue'])} valueKey="revenue" label="Revenue" /></Card>}
      {['product', 'category', 'source'].includes(group) && <Card><SectionTitle>Top by revenue</SectionTitle><RankBars rows={rows.slice(0, 10).map((r) => ({ label: r.label, value: r.revenue, sub: `${r.qty} sold · profit ${taka(r.profit)}` }))} format={taka} /></Card>}
      <Card pad={false}><div className="flex items-center justify-between p-5 pb-0"><SectionTitle>Details</SectionTitle><Btn size="sm" variant="outline" icon="download" onClick={() => downloadCsv(`sales-${group}.csv`, [['Group', 'Orders', 'Units', 'Revenue', 'Cost', 'Profit'], ...data.items.map((r) => [r.label, r.orders, r.qty, r.revenue, r.cost, r.profit])])}>CSV</Btn></div><div className="px-2 pb-3"><Table rows={rows} empty="No sales in this period." columns={[{ label: 'Group', render: (r) => <b>{r.label}</b> }, { label: 'Orders', align: 'right', key: 'orders' }, { label: 'Units', align: 'right', key: 'qty' }, { label: 'Revenue', align: 'right', render: (r) => taka(r.revenue) }, { label: 'Cost', align: 'right', render: (r) => taka(r.cost) }, { label: 'Profit', align: 'right', render: (r) => <b className={r.profit < 0 ? 'text-danger' : ''}>{taka(r.profit)}</b> }]} /></div></Card>
    </div>
  );
}

function ProfitLoss({ range }) {
  const { data: d, error } = useFetch(ENDPOINT['profit-loss'], { range });
  if (error) return <Alert>{error}</Alert>; if (!d) return <Spinner />;
  const Row = ({ label, value, bold, neg, sub }) => <div className={`flex items-baseline justify-between py-2 ${bold ? 'border-t border-taupe-200 font-bold' : ''}`}><span className={sub ? 'pl-4 text-sm text-taupe-600' : ''}>{label}</span><span className={neg ? 'text-red-700' : ''}>{neg ? '− ' : ''}{taka(value)}</span></div>;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"><Card>
      <Row label="Product sales" value={d.revenue} /><Row label="Discounts" value={d.discount} neg sub /><Row label="Delivery charged" value={d.delivery} sub /><Row label="Net sales" value={d.netSales} bold />
      <Row label="Cost of goods sold" value={d.cogs} neg /><Row label="Gross profit" value={d.grossProfit} bold />
      <Row label="Other income" value={d.otherIncome} />
      <p className="mt-3 text-sm font-bold">Operating expenses</p>{d.expenses.map((e) => <Row key={e.purpose} label={e.purpose} value={e.amount} neg sub />)}{!d.expenses.length && <p className="py-2 pl-4 text-sm text-taupe-600">None recorded.</p>}<Row label="Total expenses" value={d.totalExpenses} neg bold />
      <Row label="Damage & loss (at cost)" value={d.damageLoss} neg />
      <div className="mt-2 flex items-baseline justify-between rounded-xl bg-primary/15 px-4 py-3 text-lg font-bold"><span>Net profit</span><span className={d.netProfit < 0 ? 'text-danger' : ''}>{taka(d.netProfit)}</span></div>
      <p className="mt-3 text-xs text-taupe-600">{d.note}</p></Card>
      <div className="grid content-start gap-4"><Stat label="Orders counted" value={num(d.orders)} icon="orders" /><Stat label="Gross margin" value={d.netSales ? `${((d.grossProfit / d.netSales) * 100).toFixed(1)}%` : '—'} icon="percent" tone="green" /></div></div>
  );
}

function StockReport({ range }) {
  const { data, error } = useFetch(ENDPOINT.stock, { range });
  if (error) return <Alert>{error}</Alert>; if (!data) return <Spinner />;
  return (
    <div className="grid gap-5"><div className="grid gap-4 sm:grid-cols-2"><Stat label="Units in stock now" value={num(data.totalUnits)} icon="warehouse" /><Stat label="Stock value (cost)" value={taka(data.totalValue)} icon="wallet" tone="green" /></div>
      <Card pad={false}><div className="flex items-center justify-between p-5 pb-0"><SectionTitle>By product</SectionTitle><Btn size="sm" variant="outline" icon="download" onClick={() => downloadCsv('stock-report.csv', [['Product', 'Variant', 'SKU', 'Opening', 'In', 'Sold', 'Damaged', 'Adjusted out', 'Closing', 'Cost', 'Value'], ...data.items.map((r) => [r.name, r.label, r.sku, r.opening, r.stock_in, r.sold, r.damaged, r.adjusted_out, r.closing_now, r.cost_price, r.value])])}>CSV</Btn></div>
        <div className="px-2 pb-3"><Table rows={data.items} empty="No products." columns={[{ label: 'Product', render: (r) => <><p className="font-medium">{r.name}</p><p className="text-xs text-taupe-600">{r.label} · {r.sku}</p></> }, { label: 'Opening', align: 'right', key: 'opening' }, { label: 'In', align: 'right', key: 'stock_in' }, { label: 'Sold', align: 'right', key: 'sold' }, { label: 'Damaged', align: 'right', key: 'damaged' }, { label: 'Closing', align: 'right', render: (r) => <b>{r.closing_now}</b> }, { label: 'Value', align: 'right', render: (r) => taka(r.value) }]} /></div></Card></div>
  );
}

function Couriers({ range }) {
  const { data, error } = useFetch(ENDPOINT.couriers, { range });
  if (error) return <Alert>{error}</Alert>; if (!data) return <Spinner />;
  return <Card pad={false}><div className="px-2 py-3"><Table rows={data.items.map((r, i) => ({ ...r, id: i }))} empty="No shipments in this period." columns={[{ label: 'Courier', render: (r) => <b>{r.courier}</b> }, { label: 'Shipments', align: 'right', key: 'shipments' }, { label: 'Delivered', align: 'right', key: 'delivered' }, { label: 'Returned', align: 'right', key: 'returned' }, { label: 'On the way', align: 'right', key: 'active' }, { label: 'Success', align: 'right', render: (r) => <b>{r.success_rate == null ? '—' : `${r.success_rate}%`}</b> }, { label: 'COD delivered', align: 'right', render: (r) => taka(r.cod_delivered) }, { label: 'COD pending', align: 'right', render: (r) => taka(r.cod_pending) }]} /></div></Card>;
}

export default function Report() {
  const { kind } = useParams(); const [range, setRange] = useState('30');
  if (!TITLES[kind]) notFound();
  const Body = { sales: Sales, 'profit-loss': ProfitLoss, stock: StockReport, couriers: Couriers }[kind];
  return (<><PageHeader title={TITLES[kind][0]} subtitle={TITLES[kind][1]} actions={<Tabs value={range} onChange={setRange} tabs={RANGES} />} /><Body range={range} /></>);
}
