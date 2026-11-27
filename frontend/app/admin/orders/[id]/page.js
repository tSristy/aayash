'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { post, put, patch, useFetch } from '@/lib/admin-api';
import { taka, fmtDateTime } from '@/lib/format';
import { Alert, Badge, Btn, Card, Dl, Drawer, Modal, PageHeader, SectionTitle, Select, Spinner, StatusBadge, Textarea, useToast, I, IconBtn } from '@/components/admin/ui/kit';
import { TRANSITIONS, useOrderMeta, statusLabel } from '@/components/admin/orders/common';
import StatusDialog from '@/components/admin/orders/StatusDialog';
import CourierPanel from '@/components/admin/orders/CourierPanel';
import OrderForm from '@/components/admin/orders/OrderForm';
import VariantPicker from '@/components/admin/orders/VariantPicker';
import CustomerRiskCard from '@/components/admin/courier/CustomerRiskCard';
import { useAdmin } from '@/components/admin/AdminContext';

const PRIMARY_NEXT = { placed: 'confirmed', pending: 'confirmed', confirmed: 'packed', packaging: 'packed', packed: 'out_for_delivery', out_for_delivery: 'delivered', return_pending: 'returned' };

function ExchangeDialog({ order, items, onClose, onDone }) {
  const [ret, setRet] = useState({});
  const [newItems, setNewItems] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setError('');
    try {
      const r = await post('/orders/exchange', {
        parentOrderId: order.id,
        returnItems: items.filter((i) => Number(ret[i.id]) > 0).map((i) => ({ orderItemId: i.id, qty: Number(ret[i.id]) })),
        newItems: newItems.map((i) => ({ variantId: i.variantId, qty: Number(i.qty) })),
      });
      onDone(r);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Exchange items from ${order.order_no}`} onClose={onClose} width="max-w-2xl" footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn loading={busy} onClick={go}>Create exchange order</Btn></>}>
      <div className="grid gap-5">
        {error && <Alert>{error}</Alert>}
        <div><p className="mb-2 text-sm font-bold">1. Items coming back</p>
          {items.map((i) => (
            <div key={i.id} className="mb-2 flex items-center gap-3 rounded-xl border border-taupe-100 p-3">
              <div className="flex-1 text-sm"><p className="font-medium">{i.name}</p><p className="text-xs text-taupe-600">{i.variant_label} · delivered {i.delivered_qty ?? i.qty}</p></div>
              <input type="number" min="0" max={i.delivered_qty ?? i.qty} value={ret[i.id] ?? ''} placeholder="0" aria-label={`Return quantity ${i.name}`} onChange={(e) => setRet((s) => ({ ...s, [i.id]: e.target.value }))} className="w-20 rounded-lg border border-taupe-200 px-2 py-1.5 text-sm" />
            </div>
          ))}
        </div>
        <div><p className="mb-2 text-sm font-bold">2. Replacement items</p>
          <VariantPicker onPick={(v) => setNewItems((s) => s.some((x) => x.variantId === v.id) ? s : [...s, { variantId: v.id, name: v.name, label: v.label, qty: 1 }])} />
          {newItems.map((i) => (
            <div key={i.variantId} className="mt-2 flex items-center gap-3 rounded-xl border border-taupe-100 p-3">
              <div className="flex-1 text-sm"><p className="font-medium">{i.name}</p><p className="text-xs text-taupe-600">{i.label}</p></div>
              <input type="number" min="1" value={i.qty} onChange={(e) => setNewItems((s) => s.map((x) => x.variantId === i.variantId ? { ...x, qty: e.target.value } : x))} className="w-20 rounded-lg border border-taupe-200 px-2 py-1.5 text-sm" aria-label="Quantity" />
              <IconBtn icon="trash" label="Remove" onClick={() => setNewItems((s) => s.filter((x) => x.variantId !== i.variantId))} />
            </div>
          ))}
        </div>
        <p className="text-xs text-taupe-600">Returned units are restocked now. The customer pays or is refunded only the price difference on the new order.</p>
      </div>
    </Modal>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  const { can, refresh } = useAdmin();
  const meta = useOrderMeta();
  const { data, error, reload } = useFetch(`/orders/${id}`);
  const [dialog, setDialog] = useState(null);
  const [edit, setEdit] = useState(false);
  const [exchange, setExchange] = useState(false);
  const [noteKind, setNoteKind] = useState('internal');
  const [noteText, setNoteText] = useState('');
  const [busy, setBusy] = useState(false);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Spinner />;
  const { order, items, history, notes, customerHistory: ch } = data;
  const manage = can('orders.manage');
  const next = (TRANSITIONS[order.status] || []);
  const primary = PRIMARY_NEXT[order.status];
  const after = (label) => { setDialog(null); toast(`Order marked ${label}`); reload(); refresh(); };

  const addNote = async () => {
    if (!noteText.trim()) return;
    setBusy(true);
    try { await post(`/orders/${id}/notes`, { kind: noteKind, note: noteText }); setNoteText(''); reload(); } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader
        back={<Link href="/admin/orders" className="mb-1 inline-flex items-center gap-1 text-sm text-taupe-600 hover:text-taupe-900"><I name="left" size={15} />Orders</Link>}
        title={<span className="flex flex-wrap items-center gap-3">{order.order_no}<StatusBadge status={order.status} label={order.status_label} /></span>}
        subtitle={`Placed ${fmtDateTime(order.created_at)} · ${order.source || 'website'} · ${order.order_type}${order.parent_order_no ? ` · exchange of ${order.parent_order_no}` : ''}`}
        actions={<>
          <Link href={`/admin/orders/print?ids=${order.id}`}><Btn variant="outline" icon="print">Invoice</Btn></Link>
          {manage && order.editable && <Btn variant="outline" icon="edit" onClick={() => setEdit(true)}>Edit</Btn>}
          {can('orders.create', 'orders.manage') && ['delivered', 'partial_delivered'].includes(order.status) && <Btn variant="outline" icon="refresh" onClick={() => setExchange(true)}>Exchange</Btn>}
          {manage && primary && next.includes(primary) && <Btn onClick={() => setDialog(primary)}>{statusLabel(meta, primary)} →</Btn>}
        </>} />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5">
          <Card pad={false}>
            <div className="p-5 pb-2"><SectionTitle>Items</SectionTitle></div>
            <div className="overflow-x-auto px-2">
              <table className="w-full min-w-[520px] text-sm">
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id} className="border-t border-taupe-50">
                      <td className="w-16 px-3 py-3"><span className="grid h-12 w-12 place-items-center overflow-hidden rounded-lg bg-taupe-100">{i.image_url ? <img src={i.image_url} alt="" className="h-full w-full object-cover" /> : <I name="box" size={18} className="text-taupe" />}</span></td>
                      <td className="px-3 py-3"><p className="font-medium">{i.name}</p><p className="text-xs text-taupe-600">{i.variant_label}{i.sku ? ` · ${i.sku}` : ''}</p></td>
                      <td className="px-3 py-3 text-right text-taupe-600">{taka(i.unit_price)} × {i.qty}{i.delivered_qty != null && Number(i.delivered_qty) !== Number(i.qty) && <p className="text-xs text-amber-700">delivered {i.delivered_qty}</p>}</td>
                      <td className="px-3 py-3 text-right font-bold">{taka(i.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="ml-auto grid max-w-xs gap-1.5 p-5 text-sm">
              <div className="flex justify-between"><dt className="text-taupe-600">Subtotal</dt><dd>{taka(order.subtotal)}</dd></div>
              {Number(order.discount) > 0 && <div className="flex justify-between"><dt className="text-taupe-600">Discount</dt><dd>− {taka(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-taupe-600">Delivery</dt><dd>{taka(order.delivery_fee)}</dd></div>
              <div className="flex justify-between border-t border-taupe-100 pt-2 text-base font-bold"><dt>Total</dt><dd>{taka(order.total)}</dd></div>
              <div className="flex justify-between text-xs text-taupe-600"><dt>Payment (COD)</dt><dd className="capitalize">{order.payment_status}{order.collected_amount != null ? ` · collected ${taka(order.collected_amount)}` : ''}</dd></div>
            </dl>
          </Card>

          {manage && next.length > 0 && (
            <Card>
              <SectionTitle>Move to another status</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {next.map((s) => <Btn key={s} variant={s === 'cancelled' ? 'danger' : 'outline'} size="sm" onClick={() => setDialog(s)}>{statusLabel(meta, s)}</Btn>)}
              </div>
            </Card>
          )}

          <CourierPanel order={order} onChanged={() => { reload(); refresh(); }} />

          <Card>
            <SectionTitle>Notes</SectionTitle>
            {manage && (
              <div className="mb-4 grid gap-2">
                <div className="flex flex-wrap gap-2">{[['internal', 'Internal'], ['courier', 'For courier'], ['customer', 'Customer']].map(([v, l]) => <button key={v} type="button" onClick={() => setNoteKind(v)} className={`rounded-full px-3 py-1 text-xs font-medium ${noteKind === v ? 'bg-taupe-900 text-white' : 'bg-taupe-100'}`}>{l}</button>)}</div>
                {meta.presets.filter((p) => p.kind === noteKind).length > 0 && <div className="flex flex-wrap gap-1.5">{meta.presets.filter((p) => p.kind === noteKind).map((p) => <button key={p.id} type="button" onClick={() => setNoteText(p.text)} className="rounded-full border border-taupe-200 px-2.5 py-1 text-xs text-taupe-700 hover:bg-taupe-50">{p.text}</button>)}</div>}
                <Textarea rows={2} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Write a note…" aria-label="Note" />
                <div><Btn size="sm" onClick={addNote} loading={busy} disabled={!noteText.trim()}>Add note</Btn></div>
              </div>
            )}
            {order.note && <div className="mb-3 rounded-xl bg-amber-50 p-3 text-sm"><p className="text-xs font-bold uppercase text-amber-800">Customer note</p>{order.note}</div>}
            <ul className="grid gap-3">
              {notes.map((n) => <li key={n.id} className="rounded-xl bg-taupe-50 p-3 text-sm"><div className="mb-1 flex items-center gap-2"><Badge tone={n.kind === 'courier' ? 'blue' : n.kind === 'customer' ? 'amber' : 'gray'}>{n.kind}</Badge><span className="text-xs text-taupe-600">{n.admin} · {fmtDateTime(n.created_at)}</span></div>{n.note}</li>)}
              {!notes.length && !order.note && <li className="text-sm text-taupe-600">No notes yet.</li>}
            </ul>
          </Card>

          <Card>
            <SectionTitle>History</SectionTitle>
            <ol className="relative ml-2 grid gap-4 border-l-2 border-taupe-100 pl-5">
              {history.map((h, i) => (
                <li key={i} className="relative"><span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-white" />
                  <p className="text-sm font-medium">{statusLabel(meta, h.new_status)}</p><p className="text-xs text-taupe-600">{fmtDateTime(h.created_at)}{h.changed_by ? ` · ${h.changed_by}` : ''}</p></li>
              ))}
            </ol>
          </Card>
        </div>

        <aside className="grid content-start gap-5">
          <Card>
            <SectionTitle>Customer</SectionTitle>
            <p className="font-bold">{order.guest_name}</p>
            <a href={`tel:${order.guest_phone}`} className="flex items-center gap-2 text-sm text-primary-deep hover:underline"><I name="phone" size={15} />{order.guest_phone}</a>
            {order.guest_email && <p className="flex items-center gap-2 text-sm text-taupe-700"><I name="mail" size={15} />{order.guest_email}</p>}
            <p className="mt-3 flex gap-2 text-sm text-taupe-700"><I name="pin" size={16} className="mt-0.5" /><span>{order.address_line}{order.area ? `, ${order.area}` : ''}, {order.city}</span></p>
            {ch.isBlocked && <div className="mt-3"><Alert tone="warn">This customer or phone is on the blocklist.</Alert></div>}
            {ch.customerId && can('customers.view', 'customers.manage') && <Link href={`/admin/customers/${ch.customerId}`} className="mt-3 inline-block text-sm font-medium text-primary-deep hover:underline">Open customer profile →</Link>}
          </Card>
          <Card>
            <SectionTitle>Customer history</SectionTitle>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[['Orders', ch.totalOrders], ['Delivered', ch.deliveredOrders], ['Cancelled', ch.cancelledOrders], ['Returned', ch.returnedOrders]].map(([l, n]) => <div key={l} className="rounded-xl bg-taupe-50 py-2"><p className="text-lg font-bold">{n}</p><p className="text-[11px] uppercase text-taupe-600">{l}</p></div>)}
            </div>
            <ul className="mt-3 grid gap-1 text-sm">{ch.recentOrders.filter((o) => o.id !== order.id).slice(0, 5).map((o) => <li key={o.id}><Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-taupe-50"><span>{o.order_no}</span><span className="flex items-center gap-2"><span className="text-xs text-taupe-600">{taka(o.total)}</span><StatusBadge status={o.status} /></span></Link></li>)}</ul>
          </Card>
          <CustomerRiskCard orderId={order.id} />
          {manage && (
            <Card>
              <SectionTitle>Handled by</SectionTitle>
              <Select value={order.assigned_admin_id || ''} onChange={async (e) => { try { await patch(`/orders/${id}/assign`, { adminId: e.target.value || null }); toast('Assignment saved'); reload(); } catch (x) { toast(x.message, 'error'); } }} options={meta.admins.map((a) => ({ value: a.id, label: a.name }))} placeholder="Unassigned" aria-label="Assign to" />
              <p className="mt-2 text-xs text-taupe-600">Created by {order.created_by || 'customer'}{order.ip_address ? ` · IP ${order.ip_address}` : ''}</p>
            </Card>
          )}
        </aside>
      </div>

      {dialog && <StatusDialog order={order} items={items} target={dialog} meta={meta} onClose={() => setDialog(null)} onDone={after} />}
      {exchange && <ExchangeDialog order={order} items={items} onClose={() => setExchange(false)} onDone={(r) => { toast('Exchange order created'); router.push(`/admin/orders/${r.id}`); }} />}
      {edit && (
        <Drawer title={`Edit ${order.order_no}`} onClose={() => setEdit(false)} width="max-w-5xl">
          <OrderForm mode="edit" submitLabel="Save changes" onCancel={() => setEdit(false)}
            initial={{ name: order.guest_name, phone: order.guest_phone, email: order.guest_email || '', line1: order.address_line, city: order.city, areaId: order.area_id ? String(order.area_id) : '', discount: order.discount || '', deliveryFee: order.delivery_fee, note: order.note || '',
              items: items.map((i) => ({ variantId: i.variant_id, name: i.name, label: i.variant_label, qty: i.qty, unitPrice: i.unit_price, image: i.image_url })) }}
            onSubmit={async (p) => { await put(`/orders/${id}`, { customer: p.customer, address: p.address, items: p.items, discount: p.discount ?? 0, deliveryFee: p.deliveryFee, note: p.note }); toast('Order updated'); setEdit(false); reload(); }} />
        </Drawer>
      )}
    </>
  );
}
