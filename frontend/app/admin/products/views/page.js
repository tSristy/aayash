'use client';
import { useState } from 'react';
import { useFetch } from '@/lib/admin-api';
import { num } from '@/lib/format';
import { Alert, Card, PageHeader, SectionTitle, Spinner, Stat, Tabs } from '@/components/admin/ui/kit';
import { ColumnChart, RankBars, fillDays } from '@/components/admin/ui/charts';

const d = (n) => { const x = new Date(); x.setDate(x.getDate() - n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
export default function Views() {
  const [days, setDays] = useState('30');
  const { data, error } = useFetch('/ops/products/views-report', { days });
  if (error) return <Alert>{error}</Alert>;
  const total = data?.daily.reduce((s, x) => s + x.views, 0) || 0;
  return (
    <>
      <PageHeader title="Product views" subtitle="Which products visitors look at, and how that compares with what they buy." actions={<Tabs value={days} onChange={setDays} tabs={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} />} />
      {!data ? <Spinner /> : (
        <div className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2"><Stat label={`Views in ${days} days`} value={num(total)} icon="eye" /><Stat label="Most viewed" value={data.top[0]?.recent_views ? data.top[0].name : '—'} sub={data.top[0]?.recent_views ? `${num(data.top[0].recent_views)} views` : ''} icon="star" tone="blue" /></div>
          <Card><SectionTitle>Views per day</SectionTitle><ColumnChart data={fillDays(data.daily, d(Number(days) - 1), d(0), ['views'])} valueKey="views" money={false} label="Views" /></Card>
          <Card><SectionTitle>Top products</SectionTitle><RankBars rows={data.top.filter((p) => p.recent_views > 0).slice(0, 15).map((p) => ({ label: p.name, value: p.recent_views, sub: `${num(p.sold_count)} sold overall · ${p.recent_views ? `${((p.sold_count / Math.max(1, p.view_count)) * 100).toFixed(1)}% view→sale (lifetime)` : ''}` }))} format={(n) => `${num(n)} views`} empty="No product views recorded yet. Views are counted when shoppers open a product page." /></Card>
        </div>
      )}
    </>
  );
}
