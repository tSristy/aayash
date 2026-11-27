'use client';
import { useState } from 'react';
import { post } from '@/lib/admin-api';
import ResourceManager, { ActiveBadge } from '@/components/admin/ui/ResourceManager';
import { Alert, Badge, Btn, Input, Modal, useToast } from '@/components/admin/ui/kit';
import { fmtDateTime } from '@/lib/format';

export default function Team() {
  const toast = useToast(); const [reset, setReset] = useState(null); const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function go() { setBusy(true); setErr(''); try { await post(`/ops/admins/${reset.id}/reset-password`, { password: pw }); toast('Password reset, they were signed out'); setReset(null); setPw(''); } catch (e) { setErr(e.message); } finally { setBusy(false); } }
  return (<>
    <ResourceManager title="Team" subtitle="People who can sign in to this admin. Each has a role that decides what they see." endpoint="/ops/admins" noun="team member" writePerm="admins.manage" searchable={false} canDelete={false} createLabel="Add team member"
      columns={[{ label: 'Name', render: (a) => <><b>{a.name}</b><p className="text-xs text-taupe-600">@{a.username}</p></> }, { label: 'Role', render: (a) => <Badge tone="orange">{a.role_name}</Badge> }, { label: 'Contact', render: (a) => <span className="text-xs">{[a.phone, a.email].filter(Boolean).join(' · ')}</span> }, { label: 'Last login', render: (a) => (a.last_login_at ? fmtDateTime(a.last_login_at) : 'Never') }, { label: 'Status', render: (a) => <ActiveBadge on={a.is_active} /> }]}
      fields={[{ name: 'name', label: 'Full name', required: true }, { name: 'username', label: 'Username', required: true, hideOnEdit: true, help: 'Lowercase letters, numbers, dot, dash.' }, { name: 'role_id', label: 'Role', type: 'select', required: true, optionsFrom: { endpoint: '/ops/roles', path: 'items' } }, { name: 'phone', label: 'Phone' }, { name: 'email', label: 'Email' }, { name: 'password', label: 'Password', type: 'password', required: true, hideOnEdit: true }, { name: 'is_active', label: 'Can sign in', type: 'toggle', hideOnNew: true }]} defaults={{ is_active: true }}
      rowActions={(a) => <Btn size="sm" variant="soft" onClick={() => setReset(a)}>Reset password</Btn>} />
    {reset && <Modal title={`Reset password for ${reset.name}`} onClose={() => setReset(null)} width="max-w-md" footer={<><Btn variant="outline" onClick={() => setReset(null)}>Cancel</Btn><Btn loading={busy} disabled={pw.length < 5} onClick={go}>Reset</Btn></>}><div className="grid gap-4">{err && <Alert>{err}</Alert>}<Input label="New password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} help="They will be signed out everywhere." /></div></Modal>}
  </>);
}
