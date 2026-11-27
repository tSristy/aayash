'use client';
import { useState } from 'react';
import { del, patch, useDebounced, useFetch } from '@/lib/admin-api';
import { fmtDateTime } from '@/lib/format';
import { Alert, Badge, Btn, Card, Drawer, PageHeader, Pagination, SearchBox, Table, Tabs, Textarea, useConfirm, useToast } from '@/components/admin/ui/kit';

export default function Messages() {
  const toast = useToast(); const [ask, node] = useConfirm();
  const [status, setStatus] = useState('all'); const [q, setQ] = useState(''); const dq = useDebounced(q); const [page, setPage] = useState(1); const [open, setOpen] = useState(null); const [note, setNote] = useState('');
  const { data, error, loading, reload } = useFetch('/ops/messages', { status, q: dq || undefined, page });
  const set = async (m, st, extra = {}) => { try { await patch(`/ops/messages/${m.id}`, { status: st, ...extra }); reload(); return true; } catch (e) { toast(e.message, 'error'); return false; } };
  const show = async (m) => { setOpen(m); setNote(m.reply_note || ''); if (m.status === 'new') { await set(m, 'read'); } };
  return (
    <>
      <PageHeader title="Messages" subtitle="From the Contact form on your website." />
      <Tabs className="mb-3" value={status} onChange={(v) => { setStatus(v); setPage(1); }} tabs={[{ value: 'all', label: 'All' }, { value: 'new', label: 'New', count: data?.unread }, { value: 'read', label: 'Read' }, { value: 'replied', label: 'Replied' }]} />
      <div className="mb-3"><SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search messages" className="w-full sm:w-72" /></div>
      {error && <Alert>{error}</Alert>}
      <Card pad={false}><div className="px-2 pb-2"><Table loading={loading} rows={data?.items} onRowClick={show} empty="No messages." columns={[
        { label: 'From', render: (m) => <><p className={m.status === 'new' ? 'font-bold' : 'font-medium'}>{m.name}</p><p className="text-xs text-taupe-600">{m.phone || m.email}</p></> },
        { label: 'Message', render: (m) => <p className={`max-w-md truncate ${m.status === 'new' ? 'font-medium' : 'text-taupe-700'}`}>{m.subject ? `${m.subject} — ` : ''}{m.message}</p> }, { label: 'When', render: (m) => fmtDateTime(m.created_at) }, { label: 'Status', render: (m) => <Badge tone={m.status === 'new' ? 'orange' : m.status === 'replied' ? 'green' : 'gray'}>{m.status}</Badge> },
      ]} />{data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} label="messages" />}</div></Card>
      {open && <Drawer title={open.name} onClose={() => setOpen(null)} width="max-w-lg"><div className="grid gap-4"><Card><p className="text-sm text-taupe-600">{[open.phone && <a key="p" className="text-primary-deep" href={`tel:${open.phone}`}>{open.phone}</a>, open.email && <a key="e" className="text-primary-deep" href={`mailto:${open.email}`}>{open.email}</a>]}</p><p className="mt-1 text-xs text-taupe-600">{fmtDateTime(open.created_at)}</p>{open.subject && <p className="mt-3 font-bold">{open.subject}</p>}<p className="mt-2 whitespace-pre-wrap text-sm">{open.message}</p></Card>
        <Card><Textarea label="Internal reply note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} help="Keep track of what you told the customer." /><div className="mt-3 flex gap-2"><Btn onClick={async () => { if (await set(open, 'replied', { reply_note: note })) { toast('Marked as replied'); setOpen(null); } }}>Mark replied</Btn><Btn variant="danger" onClick={async () => { if (await ask({ title: 'Delete message?', message: 'This cannot be undone.', confirmLabel: 'Delete' })) { try { await del(`/ops/messages/${open.id}`); toast('Deleted'); setOpen(null); reload(); } catch (e) { toast(e.message, 'error'); } } }}>Delete</Btn></div></Card></div></Drawer>}
      {node}
    </>
  );
}
