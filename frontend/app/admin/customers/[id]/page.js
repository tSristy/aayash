'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { post, put, useFetch } from '@/lib/admin-api';
import { taka, fmtDate, fmtDateTime } from '@/lib/format';
import { Alert, Badge, Btn, Card, Dl, Input, Modal, PageHeader, SectionTitle, Spinner, StatusBadge, Textarea, useToast, I } from '@/components/admin/ui/kit';
import { useAdmin } from '@/components/admin/AdminContext';

export default function Customer() {
  const { id } = useParams(); const { can } = useAdmin(); const toast = useToast();
  const { data: c, error, reload } = useFetch(`/ops/customers/${id}`);
  const [edit, setEdit] = useState(null); const [block, setBlock] = useState(false); const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  if (error) return <Alert>{error}</Alert>; if (!c) return <Spinner />;
  const manage = can('customers.manage');
  const run = async (fn, msg) => { setBusy(true); setErr(''); try { await fn(); toast(msg); setEdit(null); setBlock(false); reload(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  return (
    <>
      <PageHeader back={<Link href="/admin/customers" className="mb-1 inline-flex items-center gap-1 text-sm text-taupe-600 hover:text-taupe-900"><I name="left" size={15} />Customers</Link>}
        title={<span className="flex items-center gap-3">{c.name}<Badge tone={c.is_blocked ? 'red' : c.tag === 'VIP' ? 'purple' : 'green'}>{c.tag}</Badge></span>} subtitle={`Customer since ${fmtDate(c.created_at)}`}
        actions={manage && <><Btn variant="outline" icon="edit" onClick={() => setEdit({ name: c.name, email: c.email || '', address: c.address || '', city: c.city || '', note: c.note || '' })}>Edit</Btn>{c.is_blocked ? <Btn variant="soft" onClick={() => run(() => post(`/ops/customers/${id}/unblock`), 'Customer unblocked')}>Unblock</Btn> : <Btn variant="danger" icon="ban" onClick={() => setBlock(true)}>Block</Btn>}</>} />
      {c.is_blocked && <div className="mb-4"><Alert tone="warn">Blocked{c.block_reason ? `: ${c.block_reason}` : ''}. New orders from this phone are refused.</Alert></div>}
      <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="grid gap-5">
          <Card><SectionTitle>Contact</SectionTitle><Dl cols={1} items={[['Phone', c.phone?.includes(':') ? 'Not provided yet' : c.phone], ['Email', c.email], ['City', c.city], ['Address', c.address], ['Sign-in', [c.google_id && 'Google', c.facebook_id && 'Facebook', c.password_hash === undefined ? null : null].filter(Boolean).join(', ') || 'Phone / password'], ['Last login', c.last_login_at ? fmtDateTime(c.last_login_at) : '—'], ['Note', c.note]]} /></Card>
          <Card><SectionTitle>Delivery record</SectionTitle><div className="grid grid-cols-4 gap-2 text-center">{[['Orders', c.orders_count], ['Delivered', c.delivered_count], ['Cancelled', c.cancelled_count], ['Returned', c.returned_count]].map(([l, n]) => <div key={l} className="rounded-xl bg-taupe-50 py-2"><p className="text-lg font-bold">{n}</p><p className="text-[11px] uppercase text-taupe-600">{l}</p></div>)}</div><p className="mt-3 text-sm">Success rate: <b>{c.success_rate == null ? '—' : `${c.success_rate}%`}</b> · Spent <b>{taka(c.spent)}</b></p>{c.ips?.length > 0 && <p className="mt-2 text-xs text-taupe-600">IPs used: {c.ips.join(', ')}</p>}</Card>
        </div>
        <Card pad={false}><div className="p-5 pb-2"><SectionTitle>Orders</SectionTitle></div><div className="overflow-x-auto px-2 pb-3"><table className="w-full text-sm"><tbody>
          {c.orders.map((o) => <tr key={o.id} className="border-t border-taupe-50 hover:bg-taupe-50"><td className="px-3 py-3"><Link href={`/admin/orders/${o.id}`} className="font-bold hover:underline">{o.order_no}</Link><p className="text-xs text-taupe-600">{fmtDateTime(o.created_at)}</p></td><td className="px-3 capitalize text-taupe-600">{o.source}</td><td className="px-3 text-right font-bold">{taka(o.total)}</td><td className="px-3 text-right"><StatusBadge status={o.status} /></td></tr>)}
          {!c.orders.length && <tr><td className="px-3 py-10 text-center text-taupe-600">No orders yet.</td></tr>}</tbody></table></div></Card>
      </div>
      {edit && <Modal title="Edit customer" onClose={() => setEdit(null)} footer={<><Btn variant="outline" onClick={() => setEdit(null)}>Cancel</Btn><Btn loading={busy} onClick={() => run(() => put(`/ops/customers/${id}`, edit), 'Customer updated')}>Save</Btn></>}>
        <div className="grid gap-4 sm:grid-cols-2">{err && <div className="sm:col-span-2"><Alert>{err}</Alert></div>}<Input label="Name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /><Input label="Email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /><Input label="City" value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /><Input label="Address" value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /><Textarea label="Internal note" rows={2} wrap="sm:col-span-2" value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></div></Modal>}
      {block && <Modal title="Block customer" onClose={() => setBlock(false)} width="max-w-md" footer={<><Btn variant="outline" onClick={() => setBlock(false)}>Cancel</Btn><Btn variant="danger" loading={busy} onClick={() => run(() => post(`/ops/customers/${id}/block`, { reason }), 'Customer blocked')}>Block</Btn></>}><div className="grid gap-4">{err && <Alert>{err}</Alert>}<p className="text-sm text-taupe-700">Orders from {c.phone} will be refused at checkout.</p><Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Fake orders, refused delivery…" /></div></Modal>}
    </>
  );
}
