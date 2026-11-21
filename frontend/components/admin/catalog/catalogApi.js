export const CATALOG_API = '/api/admin/catalog';
export async function catalogRequest(path, init = {}) {
    const response = await fetch(`${CATALOG_API}${path}`, { credentials: 'same-origin', cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}) } });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || (response.status === 401 ? 'Session expired. Please sign in again.' : `Request failed (${response.status})`));
    }
    return response.json();
}
export const inputClass = 'w-full rounded-xl border border-taupe-200 bg-white px-3 py-2.5 text-sm text-taupe-900 focus:border-primary focus:outline-none';
export const labelClass = 'grid gap-1.5 text-sm font-medium text-taupe-700';
export const mainButton = 'inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-taupe-900 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60';
export const secondaryButton = 'inline-flex items-center justify-center rounded-xl border border-taupe-200 bg-white px-4 py-2.5 text-sm font-medium text-taupe-700 hover:bg-taupe-50';
export const cardClass = 'rounded-card border border-taupe-200 bg-white p-5 sm:p-6';
export const slugify = s => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const fieldCode = s => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
export function Notice({ error, success }) { return <>{error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}{success && <div role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{success}</div>}</>; }
