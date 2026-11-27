'use client';
import { useState } from 'react';
import ResourceManager, { ActiveBadge } from '@/components/admin/ui/ResourceManager';
import PayDialog from '@/components/admin/accounts/PayDialog';
import { Alert, Badge, Btn, Card, Drawer, Spinner, useToast } from '@/components/admin/ui/kit';
import { useFetch } from '@/lib/admin-api';
import { taka, fmtDate } from '@/lib/format';

function Statement({ id, onClose }) {
  const { data, error } = useFetch(`/ops/suppliers/${id}`);
  return (
    <Drawer title={data?.name || 'Supplier'} onClose={onClose} width="max-w-lg">
      {error && <Alert>{error}</Alert>}{!data ? <Spinner /> : (
        <div className="grid gap-4"><Card><p className="text-sm text-taupe-600">{[data.phone, data.email, data.address].filter(Boolean).join(' · ')}</p><p className="mt-2 text-sm">Owed now</p><p className="text-2xl font-bold text-amber-700">{taka(data.due)}</p></Card>
          <Card><p className="mb-2 font-bold">Purchases</p>{data.purchases.length ? <ul className="grid gap-1 text-sm">{data.purchases.map((p) => <li key={p.id} className="flex justify-between rounded-lg bg-taupe-50 px-3 py-2"><span>{p.ref_no} · {fmtDate(p.purchase_date)} {p.status === 'cancelled' && <Badge tone="red">cancelled</Badge>}</span><span>{taka(p.total)} <span className="text-taupe-600">(paid {taka(p.paid)})</span></span></li>)}</ul> : <p className="text-sm text-taupe-600">None yet.</p>}</Card>
          <Card><p className="mb-2 font-bold">Payments made</p>{data.payments.length ? <ul className="grid gap-1 text-sm">{data.payments.map((p) => <li key={p.id} className="flex justify-between rounded-lg bg-taupe-50 px-3 py-2"><span>{fmtDate(p.txn_date)} · {p.account}</span><b>{taka(p.amount)}</b></li>)}</ul> : <p className="text-sm text-taupe-600">None yet.</p>}</Card></div>)}
    </Drawer>
  );
}

export default function Suppliers() {
  const toast = useToast(); const [pay, setPay] = useState(null); const [view, setView] = useState(null); const [tick, setTick] = useState(0);
  return (
    <>
      <ResourceManager key={tick} title="Suppliers" subtitle="Who you buy from, and what you owe them." endpoint="/ops/suppliers" noun="supplier" writePerm="purchases.manage" searchPlaceholder="Search suppliers" createLabel="Add supplier"
        columns={[{ label: 'Supplier', render: (s) => <><button className="font-bold hover:underline" onClick={() => setView(s.id)}>{s.name}</button><p className="text-xs text-taupe-600">{s.phone}</p></> }, { label: 'Purchased', align: 'right', render: (s) => taka(s.purchased) }, { label: 'We owe', align: 'right', render: (s) => <b className={s.due > 0 ? 'text-amber-700' : ''}>{taka(s.due)}</b> }, { label: 'Status', render: (s) => <ActiveBadge on={s.is_active} /> }]}
        fields={[{ name: 'name', label: 'Name', required: true, span: 2 }, { name: 'phone', label: 'Phone' }, { name: 'email', label: 'Email', type: 'email' }, { name: 'address', label: 'Address', span: 2 }, { name: 'opening_due', label: 'Opening due (৳)', type: 'number', step: '0.01', help: 'What you already owed before using this system.' }, { name: 'is_active', label: 'Active', type: 'toggle' }, { name: 'note', label: 'Note', type: 'textarea', rows: 2, span: 2 }]}
        defaults={{ is_active: true, opening_due: 0 }}
        rowActions={(s) => s.due > 0 && <Btn size="sm" variant="soft" onClick={() => setPay(s)}>Pay</Btn>} />
      {pay && <PayDialog title={`Pay ${pay.name}`} path={`/ops/suppliers/${pay.id}/pay`} max={pay.due} withDate={false} onClose={() => setPay(null)} onDone={() => { setPay(null); toast('Payment recorded (oldest purchases first)'); setTick((n) => n + 1); }} />}
      {view && <Statement id={view} onClose={() => setView(null)} />}
    </>
  );
}
