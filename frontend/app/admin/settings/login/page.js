'use client';
import SettingsForm from '@/components/admin/ui/SettingsForm';
import { Alert, PageHeader } from '@/components/admin/ui/kit';
export default function Login() {
  return (<><PageHeader title="Customer sign-in" subtitle="Let customers sign in with Google or Facebook." />
    <div className="mb-4"><Alert tone="info">In Google Cloud / Meta for Developers, set the redirect address to <code>{'<your site>'}/api/customer/auth/google/callback</code> and <code>/api/customer/auth/facebook/callback</code>.</Alert></div>
    <SettingsForm save="/ops/settings/general" sections={[
      { title: 'Google', fields: [{ key: 'google_login_enabled', label: 'Enable Google sign-in', type: 'toggle', span: 2 }, { key: 'google_client_id', label: 'Client ID' }, { key: 'google_client_secret', label: 'Client secret', type: 'password' }] },
      { title: 'Facebook', fields: [{ key: 'facebook_login_enabled', label: 'Enable Facebook sign-in', type: 'toggle', span: 2 }, { key: 'facebook_app_id', label: 'App ID' }, { key: 'facebook_app_secret', label: 'App secret', type: 'password' }] },
    ]} /></>);
}
