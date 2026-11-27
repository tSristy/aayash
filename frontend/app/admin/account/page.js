'use client';
import { useState } from 'react';
import { post } from '@/lib/admin-api';
import { Alert, Btn, Card, Dl, Input, PageHeader, SectionTitle, useToast } from '@/components/admin/ui/kit';
import { useAdmin } from '@/components/admin/AdminContext';

export default function Account() {
  const { session: user } = useAdmin(); const toast = useToast();
  const [f, setF] = useState({ currentPassword: '', newPassword: '', again: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  async function save(e) { e.preventDefault(); setErr(''); if (f.newPassword !== f.again) return setErr('The new passwords do not match.'); setBusy(true); try { await post('/ops/me/password', { currentPassword: f.currentPassword, newPassword: f.newPassword }); toast('Password changed'); setF({ currentPassword: '', newPassword: '', again: '' }); } catch (x) { setErr(x.message); } finally { setBusy(false); } }
  return (<><PageHeader title="My account" />
    <div className="grid max-w-3xl gap-5"><Card><SectionTitle>Profile</SectionTitle><Dl items={[['Name', user?.name], ['Username', user?.username], ['Role', String(user?.role || '').replace(/_/g, ' ')]]} /></Card>
      <Card><SectionTitle>Change password</SectionTitle><form onSubmit={save} className="grid gap-4 sm:max-w-sm">{err && <Alert>{err}</Alert>}<Input label="Current password" type="password" value={f.currentPassword} onChange={(e) => set('currentPassword', e.target.value)} /><Input label="New password" type="password" value={f.newPassword} onChange={(e) => set('newPassword', e.target.value)} help="At least 5 characters; longer is safer." /><Input label="New password again" type="password" value={f.again} onChange={(e) => set('again', e.target.value)} /><Btn type="submit" loading={busy} disabled={!f.currentPassword || !f.newPassword}>Change password</Btn></form></Card></div></>);
}
