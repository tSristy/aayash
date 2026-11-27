'use client';
import { useState } from 'react';
import ResourceManager from '@/components/admin/ui/ResourceManager';
import PayDialog from '@/components/admin/accounts/PayDialog';
import { Badge, Btn, useToast } from '@/components/admin/ui/kit';
import { taka, fmtDate } from '@/lib/format';

export default function Bills() {
  const toast = useToast(); const [pay, setPay] = useState(null); const [tick, setTick] = useState(0);
  return (
    <>
      <ResourceManager key={tick} title="Bills" subtitle="Rent, electricity, internet and other bills to pay. Paying posts an expense automatically." endpoint="/ops/bills" noun="bill" writePerm="accounts.manage" searchable={false} createLabel="Add bill"
        filters={[{ name: 'status', label: 'Status', options: [{ value: 'unpaid', label: 'Unpaid' }, { value: 'paid', label: 'Paid' }] }]}
        columns={[{ label: 'Bill', render: (b) => <><p className="font-medium">{b.title}</p><p className="text-xs text-taupe-600">{b.purpose || ''}</p></> }, { label: 'Amount', align: 'right', render: (b) => <b>{taka(b.amount)}</b> }, { label: 'Due', render: (b) => <span className={b.overdue ? 'font-bold text-danger' : ''}>{fmtDate(b.due_date)}{b.overdue ? ' · overdue' : ''}</span> },
          { label: 'Status', render: (b) => <Badge tone={b.status === 'paid' ? 'green' : b.overdue ? 'red' : 'amber'}>{b.status}</Badge> }, { label: 'Paid from', render: (b) => (b.status === 'paid' ? `${b.account || ''} · ${fmtDate(b.paid_on)}` : '—') }]}
        fields={[{ name: 'title', label: 'Title', required: true, span: 2 }, { name: 'amount', label: 'Amount (৳)', type: 'number', step: '0.01', required: true }, { name: 'due_date', label: 'Due date', type: 'date' }, { name: 'purpose_id', label: 'Purpose', type: 'select', optionsFrom: { endpoint: '/ops/purposes', query: { kind: 'expense' }, path: 'items' }, span: 2 }, { name: 'note', label: 'Note', type: 'textarea', rows: 2, span: 2 }]}
        canDelete={(b) => b.status === 'unpaid'}
        rowActions={(b) => b.status === 'unpaid' && <Btn size="sm" variant="soft" onClick={() => setPay(b)}>Pay</Btn>} />
      {pay && <PayDialog title={`Pay ${pay.title}`} path={`/ops/bills/${pay.id}/pay`} fixedAmount={pay.amount} onClose={() => setPay(null)} onDone={() => { setPay(null); toast('Bill paid'); setTick((n) => n + 1); }} />}
    </>
  );
}
