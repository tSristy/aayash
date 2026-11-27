'use client';
import { useState } from 'react';
import { post, useFetch } from '@/lib/admin-api';
import { taka, fmtDate, todayStr } from '@/lib/format';
import { Alert, Badge, Btn, Card, Input, Modal, PageHeader, SectionTitle, Tabs, Table, useToast } from '@/components/admin/ui/kit';
import { AccountSelect } from '@/components/admin/accounts/bits';
import ResourceManager, { ActiveBadge } from '@/components/admin/ui/ResourceManager';
import { useAdmin } from '@/components/admin/AdminContext';

function Salary() {
  const { can } = useAdmin(); const toast = useToast();
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const { data, error, loading, reload } = useFetch('/ops/salary', { month });
  const [pay, setPay] = useState(null); const [amount, setAmount] = useState(''); const [accountId, setAccountId] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const open = (e) => { setPay(e); setAmount(String(e.remaining)); setErr(''); };
  async function go() { setBusy(true); setErr(''); try { await post('/ops/salary', { employeeId: pay.employee_id, month, amount: Number(amount), accountId: Number(accountId) }); toast('Salary paid'); setPay(null); reload(); } catch (e) { setErr(e.message); } finally { setBusy(false); } }
  const total = (data?.items || []).reduce((s, i) => s + i.monthly_salary, 0); const paid = (data?.items || []).reduce((s, i) => s + i.paid, 0);
  return (
    <>
      <PageHeader title="Employees & salary" subtitle="Pay salaries monthly. Each payment posts an expense." actions={<input type="month" aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-full bg-white px-4 py-2 text-sm shadow-card" />} />
      {error && <Alert>{error}</Alert>}
      <Card pad={false}><div className="p-5 pb-0"><SectionTitle right={<span className="text-sm text-taupe-600">Paid {taka(paid)} of {taka(total)}</span>}>Salary for {month}</SectionTitle></div><div className="px-2 pb-2">
        <Table loading={loading} rows={(data?.items || []).map((i) => ({ ...i, id: i.employee_id }))} empty="No employees yet. Add them below." columns={[
          { label: 'Employee', render: (e) => <><p className="font-medium">{e.name}</p><p className="text-xs text-taupe-600">{e.designation}</p></> }, { label: 'Monthly salary', align: 'right', render: (e) => taka(e.monthly_salary) }, { label: 'Paid', align: 'right', render: (e) => taka(e.paid) },
          { label: 'Remaining', align: 'right', render: (e) => <b>{taka(e.remaining)}</b> }, { label: 'Status', render: (e) => (e.remaining <= 0 ? <Badge tone="green">Paid</Badge> : e.paid > 0 ? <Badge tone="amber">Partly paid</Badge> : <Badge>Unpaid</Badge>) },
          { label: '', align: 'right', render: (e) => can('accounts.manage') && e.remaining > 0 && <Btn size="sm" variant="soft" onClick={() => open(e)}>Pay</Btn> }]} /></div></Card>
      {data?.payments?.length > 0 && <Card className="mt-5"><SectionTitle>Payments in {month}</SectionTitle><ul className="grid gap-2 text-sm">{data.payments.map((p) => <li key={p.id} className="flex justify-between rounded-xl bg-taupe-50 px-3 py-2"><span>{data.items.find((i) => i.employee_id === p.employee_id)?.name} · {fmtDate(p.paid_on)} · {p.account}</span><b>{taka(p.amount)}</b></li>)}</ul></Card>}
      {pay && <Modal title={`Pay ${pay.name}`} onClose={() => setPay(null)} width="max-w-md" footer={<><Btn variant="outline" onClick={() => setPay(null)}>Cancel</Btn><Btn loading={busy} disabled={!accountId || !(Number(amount) > 0)} onClick={go}>Pay</Btn></>}>
        <div className="grid gap-4">{err && <Alert>{err}</Alert>}<Input label="Amount (৳)" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} help={`Remaining for ${month}: ${taka(pay.remaining)}`} /><AccountSelect value={accountId} onChange={setAccountId} required /></div></Modal>}
    </>
  );
}

export default function Page() {
  const [tab, setTab] = useState('salary');
  return (
    <>
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ value: 'salary', label: 'Pay salary' }, { value: 'employees', label: 'Manage employees' }]} />
      {tab === 'salary' ? <Salary /> : (
        <ResourceManager title="Employees" endpoint="/ops/employees" noun="employee" writePerm="accounts.manage" searchable={false} canDelete={false} createLabel="Add employee"
          columns={[{ label: 'Name', render: (e) => <b>{e.name}</b> }, { key: 'designation', label: 'Role' }, { key: 'phone', label: 'Phone' }, { label: 'Monthly salary', align: 'right', render: (e) => taka(e.monthly_salary) }, { label: 'Joined', render: (e) => fmtDate(e.joined_on) }, { label: 'Status', render: (e) => <ActiveBadge on={e.is_active} /> }]}
          fields={[{ name: 'name', label: 'Name', required: true }, { name: 'designation', label: 'Role / designation' }, { name: 'phone', label: 'Phone' }, { name: 'monthly_salary', label: 'Monthly salary (৳)', type: 'number', step: '0.01' }, { name: 'joined_on', label: 'Joined on', type: 'date' }, { name: 'is_active', label: 'Active', type: 'toggle' }]} defaults={{ is_active: true }} />
      )}
    </>
  );
}
