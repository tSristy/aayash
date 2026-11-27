'use client';
import ResourceManager, { ActiveBadge } from '@/components/admin/ui/ResourceManager';
import { Badge } from '@/components/admin/ui/kit';
import { taka } from '@/lib/format';

export default function Setup() {
  return (
    <div className="grid gap-10">
      <ResourceManager title="Accounts" subtitle="Cash drawer, bank accounts and mobile wallets. Pick which one receives COD and POS money." endpoint="/ops/accounts" noun="account" writePerm="accounts.manage" searchable={false} canDelete={(a) => !a.is_default} createLabel="Add account"
        columns={[{ label: 'Name', render: (a) => <><b>{a.name}</b>{a.is_default && <Badge tone="orange" className="ml-2">default</Badge>}</> }, { label: 'Type', render: (a) => <span className="capitalize">{a.type}</span> }, { label: 'Opening', align: 'right', render: (a) => taka(a.opening_balance) }, { label: 'Balance', align: 'right', render: (a) => <b>{taka(a.balance)}</b> }, { label: 'Status', render: (a) => <ActiveBadge on={a.is_active} /> }]}
        fields={[{ name: 'name', label: 'Name', required: true }, { name: 'type', label: 'Type', type: 'select', required: true, options: [{ value: 'cash', label: 'Cash' }, { value: 'bank', label: 'Bank' }, { value: 'mobile', label: 'Mobile wallet (bKash, Nagad)' }] }, { name: 'opening_balance', label: 'Opening balance (৳)', type: 'number', step: '0.01' }, { name: 'is_active', label: 'Active', type: 'toggle' }, { name: 'is_default', label: 'Make default account', type: 'toggle', default: false, span: 2 }]} defaults={{ type: 'cash', opening_balance: 0, is_active: true }} />
      <ResourceManager title="Income & expense purposes" subtitle="Categories used when adding income or expense. Built-in ones cannot be changed." endpoint="/ops/purposes" noun="purpose" writePerm="accounts.manage" searchable={false} createLabel="Add purpose" canDelete={(p) => !p.is_system}
        filters={[{ name: 'kind', label: 'Type', options: [{ value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }] }]}
        columns={[{ label: 'Name', render: (p) => <b>{p.name}</b> }, { label: 'Type', render: (p) => <Badge tone={p.kind === 'income' ? 'green' : 'red'}>{p.kind}</Badge> }, { label: '', render: (p) => p.is_system && <Badge>built-in</Badge> }, { label: 'Status', render: (p) => <ActiveBadge on={p.is_active} /> }]}
        fields={[{ name: 'name', label: 'Name', required: true }, { name: 'kind', label: 'Type', type: 'select', required: true, options: [{ value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }], hideOnEdit: true }, { name: 'is_active', label: 'Active', type: 'toggle', hideOnNew: true }]} defaults={{ kind: 'expense', is_active: true }} />
    </div>
  );
}
