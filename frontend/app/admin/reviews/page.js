'use client';
import { useState } from 'react';
import { del, patch, useFetch } from '@/lib/admin-api';
import { fmtDateTime } from '@/lib/format';
import { Alert, Badge, Btn, Card, Pagination, PageHeader, Tabs, Textarea, useConfirm, useToast, I } from '@/components/admin/ui/kit';

const Stars = ({ n }) => <span className="text-primary" aria-label={`${n} of 5`}>{'★'.repeat(n)}<span className="text-taupe-200">{'★'.repeat(5 - n)}</span></span>;
function Review({ r, reload }) {
  const toast = useToast(); const [ask, node] = useConfirm(); const [reply, setReply] = useState(r.admin_reply || ''); const [open, setOpen] = useState(false);
  const act = async (body, msg) => { try { await patch(`/ops/reviews/${r.id}`, body); toast(msg); reload(); } catch (e) { toast(e.message, 'error'); } };
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{r.author} <span className="font-normal text-taupe-600">on {r.product_name}</span></p><p className="text-xs text-taupe-600">{fmtDateTime(r.created_at)}</p></div><div className="flex items-center gap-2"><Stars n={r.rating} /><Badge tone={r.status === 'approved' ? 'green' : r.status === 'pending' ? 'amber' : 'gray'}>{r.status}</Badge></div></div>
      {r.body && <p className="mt-3 text-sm">{r.body}</p>}
      {r.admin_reply && !open && <p className="mt-3 rounded-xl bg-taupe-50 p-3 text-sm"><b>Your reply:</b> {r.admin_reply}</p>}
      {open && <div className="mt-3 grid gap-2"><Textarea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Public reply shown under the review" /><div className="flex gap-2"><Btn size="sm" onClick={() => { act({ admin_reply: reply }, 'Reply saved'); setOpen(false); }}>Save reply</Btn><Btn size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn></div></div>}
      <div className="mt-4 flex flex-wrap gap-2">
        {r.status !== 'approved' && <Btn size="sm" icon="check" onClick={() => act({ status: 'approved' }, 'Approved, now visible in the shop')}>Approve</Btn>}
        {r.status !== 'hidden' && <Btn size="sm" variant="outline" onClick={() => act({ status: 'hidden' }, 'Hidden from the shop')}>Hide</Btn>}
        <Btn size="sm" variant="outline" icon="message" onClick={() => setOpen(true)}>Reply</Btn>
        <Btn size="sm" variant="danger" onClick={async () => { if (await ask({ title: 'Delete review?', message: 'This cannot be undone.', confirmLabel: 'Delete' })) { try { await del(`/ops/reviews/${r.id}`); toast('Deleted'); reload(); } catch (e) { toast(e.message, 'error'); } } }}>Delete</Btn>
      </div>{node}
    </Card>
  );
}
export default function Reviews() {
  const [status, setStatus] = useState('pending'); const [page, setPage] = useState(1);
  const { data, error, reload } = useFetch('/ops/reviews', { status, page });
  return (
    <>
      <PageHeader title="Reviews" subtitle="New reviews stay hidden until you approve them." />
      <Tabs className="mb-4" value={status} onChange={(v) => { setStatus(v); setPage(1); }} tabs={[{ value: 'pending', label: 'Waiting', count: data?.pending }, { value: 'approved', label: 'Approved' }, { value: 'hidden', label: 'Hidden' }, { value: 'all', label: 'All' }]} />
      {error && <Alert>{error}</Alert>}
      <div className="grid gap-4">{data?.items.map((r) => <Review key={`${r.id}-${r.status}`} r={r} reload={reload} />)}{data && !data.items.length && <Card><p className="py-10 text-center text-taupe-600">No reviews here.</p></Card>}</div>
      {data && <div className="mt-4"><Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} label="reviews" /></div>}
    </>
  );
}
