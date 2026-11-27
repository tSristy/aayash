'use client';
import Link from 'next/link';
import { useFetch } from '@/lib/admin-api';
import { taka } from '@/lib/format';
import { Alert, Badge, Card, PageHeader, SectionTitle, Spinner, Stat, I } from '@/components/admin/ui/kit';

const ICON = { cash: 'wallet', bank: 'bank', mobile: 'phone' };
export default function Accounts() {
  const { data, error } = useFetch('/ops/accounts/overview');
  if (error) return <Alert>{error}</Alert>; if (!data) return <Spinner />;
  const net = data.receivable - data.payable - data.supplierDue - data.unpaidBills;
  return (
    <>
      <PageHeader title="Accounts" subtitle="Where the money is, and what is owed." />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total balance" value={taka(data.totalBalance)} icon="wallet" tone="green" />
        <Stat label="Income this month" value={taka(data.monthIncome)} icon="arrowDown" tone="green" href="/admin/accounts/transactions?kind=income" />
        <Stat label="Expense this month" value={taka(data.monthExpense)} icon="arrowUp" tone="red" href="/admin/accounts/transactions?kind=expense" />
        <Stat label="Profit this month (cash)" value={taka(data.monthIncome - data.monthExpense)} icon="trend" tone="blue" />
      </div>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="To receive" value={taka(data.receivable)} icon="users" href="/admin/accounts/dues" tone="gray" />
        <Stat label="To pay (dues)" value={taka(data.payable)} icon="clock" href="/admin/accounts/dues" tone="gray" />
        <Stat label="Owed to suppliers" value={taka(data.supplierDue)} icon="cart" href="/admin/suppliers" tone="gray" />
        <Stat label={`Unpaid bills (${data.unpaidBillCount})`} value={taka(data.unpaidBills)} icon="receipt" href="/admin/accounts/bills" tone="gray" />
      </div>
      <Card>
        <SectionTitle right={<Link href="/admin/accounts/setup" className="text-sm font-medium text-primary-deep hover:underline">Manage accounts</Link>}>Accounts</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.accounts.map((a) => (
            <div key={a.id} className={`flex items-center gap-3 rounded-2xl border border-taupe-100 p-4 ${a.is_active ? '' : 'opacity-50'}`}>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/15 text-primary-deep"><I name={ICON[a.type] || 'wallet'} /></span>
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{a.name}</p><p className="text-xs capitalize text-taupe-600">{a.type}{a.is_default ? ' · default' : ''}</p></div>
              <p className={`text-lg font-bold ${a.balance < 0 ? 'text-danger' : ''}`}>{taka(a.balance)}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-taupe-600">Net position after dues and bills: <b className={net < 0 ? 'text-danger' : 'text-taupe-900'}>{taka(net)}</b></p>
      </Card>
    </>
  );
}
