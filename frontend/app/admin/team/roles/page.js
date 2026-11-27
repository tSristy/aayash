'use client';
import { useState } from 'react';
import { del, post, put, useFetch } from '@/lib/admin-api';
import { Alert, Badge, Btn, Card, Input, Modal, PageHeader, Spinner, Textarea, useConfirm, useToast } from '@/components/admin/ui/kit';
import { useAdmin } from '@/components/admin/AdminContext';

function RoleDialog({ role, groups, onClose, onDone }) {
  const locked = role?.code === 'super_admin';
  const [f, setF] = useState({ name: role?.name || '', description: role?.description || '', permissions: new Set(role?.permissions || []) });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const toggle = (c) => setF((s) => { const p = new Set(s.permissions); p.has(c) ? p.delete(c) : p.add(c); return { ...s, permissions: p }; });
  const body = () => ({ name: f.name, description: f.description, permissions: [...f.permissions] });
  async function save() { setBusy(true); setErr(''); try { role?.id ? await put(`/ops/roles/${role.id}`, body()) : await post('/ops/roles', body()); onDone(); } catch (e) { setErr(e.message); } finally { setBusy(false); } }
  return (
    <Modal title={role?.id ? `Edit role: ${role.name}` : 'New role'} onClose={onClose} width="max-w-3xl" footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn>{!locked && <Btn loading={busy} disabled={!f.name} onClick={save}>Save role</Btn>}</>}>
      <div className="grid gap-4">{err && <Alert>{err}</Alert>}{locked && <Alert tone="info">Super admin always has every permission and cannot be changed.</Alert>}
        <div className="grid gap-3 sm:grid-cols-2"><Input label="Role name" value={f.name} disabled={locked} onChange={(e) => setF({ ...f, name: e.target.value })} /><Input label="Description" value={f.description} disabled={locked} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="grid gap-3 sm:grid-cols-2">{groups.map((g) => (
          <div key={g.name} className="rounded-2xl border border-taupe-100 p-4"><p className="mb-2 text-sm font-bold">{g.name}</p><div className="grid gap-1.5">{g.items.map((p) => <label key={p.code} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={locked} checked={locked || f.permissions.has(p.code)} onChange={() => toggle(p.code)} className="h-4 w-4 accent-primary" />{p.label}</label>)}</div></div>))}</div>
      </div>
    </Modal>
  );
}

export default function Roles() {
  const toast = useToast(); const [ask, node] = useConfirm(); const { can } = useAdmin();
  const { data, reload } = useFetch('/ops/roles'); const { data: perms } = useFetch('/ops/permissions'); const [edit, setEdit] = useState(null);
  if (!data || !perms) return <Spinner />;
  return (<>
    <PageHeader title="Roles & permissions" subtitle="Decide exactly which parts of the admin each role can open." actions={can('admins.manage') && <Btn icon="plus" onClick={() => setEdit({})}>New role</Btn>} />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.items.map((r) => (
      <Card key={r.id}><div className="flex items-start justify-between"><div><p className="font-bold">{r.name}</p><p className="text-sm text-taupe-600">{r.description}</p></div>{r.code === 'super_admin' && <Badge tone="orange">Full access</Badge>}</div>
        <p className="mt-3 text-sm text-taupe-700">{r.user_count} member{r.user_count === 1 ? '' : 's'} · {r.permissions.length} permissions</p>
        <div className="mt-4 flex gap-2"><Btn size="sm" variant="outline" onClick={() => setEdit(r)}>{r.code === 'super_admin' ? 'View' : 'Edit'}</Btn>
          {!r.is_system && r.code !== 'super_admin' && <Btn size="sm" variant="ghost" onClick={async () => { if (!(await ask({ title: `Delete ${r.name}?`, message: 'Only possible when nobody has this role.', confirmLabel: 'Delete' }))) return; try { await del(`/ops/roles/${r.id}`); toast('Role deleted'); reload(); } catch (e) { toast(e.message, 'error'); } }}>Delete</Btn>}</div></Card>))}</div>
    {edit && <RoleDialog role={edit.id ? edit : null} groups={perms.groups} onClose={() => setEdit(null)} onDone={() => { setEdit(null); toast('Role saved'); reload(); }} />}{node}
  </>);
}
