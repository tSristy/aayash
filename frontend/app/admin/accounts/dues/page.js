'use client';
import { useState } from 'react';
import ResourceManager from '@/components/admin/ui/ResourceManager';
import PayDialog from '@/components/admin/accounts/PayDialog';
import { Badge, Btn, useToast } from '@/components/admin/ui/kit';
import { taka, fmtDate } from '@/lib/format';

export default function Dues() {
  const toast = useToast(); const [pay, setPay] = useState(null); const [tick, setTick] = useState(0);
  return (
    <>
      <ResourceManager key={tick} title="Dues" subtitle="Money customers or shops owe you (receivable) and small debts you owe (payable). Supplier dues live under Purchases." endpoint="/ops/dues" noun="due" writePerm="accounts.manage" searchable={false} createLabel="Add due"
        filters={[{ name: 'direction', label: 'Type', options: [{ value: 'receivable', label: 'To receive' }, { value: 'payable', label: 'To pay' }] }, { name: 'status', label: 'Status', options: [{ value: 'open', label: 'Open' }, { value: 'settled', label: 'Settled' }] }]}
        columns={[{ label: 'Party', render: (d) => <><p className="font-medium">{d.party_name}</p><p className="text-xs text-taupe-600">{d.party_phone}</p></> }, { label: 'Type', render: (d) => <Badge tone={d.direction === 'receivable' ? 'green' : 'amber'}>{d.direction === 'receivable' ? 'To receive' : 'To pay'}</Badge> },
          { label: 'Amount', align: 'right', render: (d) => taka(d.amount) }, { label: 'Paid', align: 'right', render: (d) => taka(d.paid) }, { label: 'Remaining', align: 'right', render: (d) => <b>{taka(d.remaining)}</b> }, { label: 'Due date', render: (d) => fmtDate(d.due_date) }, { label: 'Status', render: (d) => <Badge tone={d.status === 'open' ? 'amber' : 'green'}>{d.status}</Badge> }]}
        fields={[{ name: 'direction', label: 'Type', type: 'select', required: true, options: [{ value: 'receivable', label: 'Someone owes me (to receive)' }, { value: 'payable', label: 'I owe someone (to pay)' }], span: 2 }, { name: 'party_name', label: 'Name', required: true }, { name: 'party_phone', label: 'Phone' }, { name: 'amount', label: 'Amount (৳)', type: 'number', step: '0.01', required: true }, { name: 'due_date', label: 'Due date', type: 'date' }, { name: 'note', label: 'Note', type: 'textarea', rows: 2, span: 2 }]}
        defaults={{ direction: 'receivable' }} canDelete={(d) => Number(d.paid) === 0}
        rowActions={(d) => d.status === 'open' && <Btn size="sm" variant="soft" onClick={() => setPay(d)}>{d.direction === 'receivable' ? 'Receive' : 'Pay'}</Btn>} />
      {pay && <PayDialog title={`${pay.direction === 'receivable' ? 'Receive from' : 'Pay'} ${pay.party_name}`} path={`/ops/dues/${pay.id}/pay`} max={pay.remaining} onClose={() => setPay(null)} onDone={() => { setPay(null); toast('Payment recorded'); setTick((n) => n + 1); }} />}
    </>
  );
}
