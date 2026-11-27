'use client';
import { useState } from 'react';
import { post } from '@/lib/admin-api';
import { taka, todayStr } from '@/lib/format';
import { Alert, Btn, Input, Modal } from '../ui/kit';
import { AccountSelect } from './bits';

/** Record a payment against a due, bill or supplier. `path` is the POST endpoint. */
export default function PayDialog({ title, path, max, fixedAmount, onClose, onDone, withDate = true }) {
  const [amount, setAmount] = useState(fixedAmount ?? max ?? '');
  const [accountId, setAccountId] = useState(''); const [date, setDate] = useState(todayStr());
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function go() { setBusy(true); setError(''); try { await post(path, { amount: Number(amount), accountId: Number(accountId), date }); onDone(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return (
    <Modal title={title} onClose={onClose} width="max-w-md" footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn loading={busy} disabled={!accountId || !(Number(amount) > 0)} onClick={go}>Record payment</Btn></>}>
      <div className="grid gap-4">{error && <Alert>{error}</Alert>}
        <Input label="Amount (৳)" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={fixedAmount !== undefined} help={max ? `Outstanding: ${taka(max)}` : undefined} />
        <AccountSelect label="Paid from / received into" value={accountId} onChange={setAccountId} required />
        {withDate && <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
      </div>
    </Modal>
  );
}
