'use client';

import { loadCatalogChoices } from './catalogLookups';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { catalogRequest, Notice, inputClass, labelClass, cardClass, mainButton, secondaryButton, slugify } from './catalogApi';
export default function MasterForm({ entity, id }) {
    const category = entity === 'categories', title = category ? 'Category' : 'Brand', editing = !!id, router = useRouter();
    const [form, setForm] = useState({ name: '', slug: '', parent_id: '', sort_order: 0, emoji: '', image_url: '', is_active: true }), [rows, setRows] = useState([]), [error, setError] = useState(''), [loading, setLoading] = useState(editing), [saving, setSaving] = useState(false), [autoSlug, setAutoSlug] = useState(!editing);
    useEffect(() => { let ok = true; (async () => { try {
        if (category) {
            const all = await loadCatalogChoices('categories');
            if (ok)
                setRows(all);
        }
        if (editing) {
            const data = await catalogRequest(`/${entity}/${id}`);
            if (ok)
                setForm({ ...data, parent_id: data.parent_id || '', emoji: data.emoji || '', image_url: data.image_url || '' });
        }
    }
    catch (e) {
        if (ok)
            setError(e.message);
    }
    finally {
        if (ok)
            setLoading(false);
    } })(); return () => { ok = false; }; }, [entity, id, category, editing]);
    const edit = (key, value) => setForm(s => ({ ...s, [key]: value }));
    async function submit(e) { e.preventDefault(); setSaving(true); setError(''); try {
        const payload = { name: form.name.trim(), slug: form.slug.trim(), is_active: !!form.is_active };
        if (category)
            Object.assign(payload, { parent_id: form.parent_id ? Number(form.parent_id) : null, emoji: form.emoji, sort_order: Number(form.sort_order), image_url: form.image_url });
        const saved = await catalogRequest(editing ? `/${entity}/${id}` : `/${entity}`, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
        router.push(`/admin/${entity}/${saved.id}`);
        router.refresh();
    }
    catch (e) {
        setError(e.message);
    }
    finally {
        setSaving(false);
    } }
    return <div className="grid gap-5"><div><Link href={`/admin/${entity}`} className="text-sm text-primary-deep hover:underline">← Back to {entity}</Link><h2 className="mt-2 text-xl">{editing ? 'Edit' : 'Add New'} {title}</h2><p className="mt-1 text-sm text-taupe-600">{editing ? 'Update the record without deleting product references.' : 'Add a new catalog master record.'}</p></div><Notice error={error}/>{loading ? <p>Loading...</p> : <form onSubmit={submit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]"><section className={`${cardClass} grid gap-5`}><h3 className="text-lg">{title} Details</h3><label className={labelClass}>Name *<input required className={inputClass} maxLength="120" value={form.name} onChange={e => { const name = e.target.value; setForm(s => ({ ...s, name, slug: autoSlug ? slugify(name) : s.slug })); }}/></label><label className={labelClass}>Slug *<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength="140" className={inputClass} value={form.slug} onChange={e => { setAutoSlug(false); edit('slug', slugify(e.target.value)); }}/></label>{category && <><label className={labelClass}>Parent Category<select className={inputClass} value={form.parent_id} onChange={e => edit('parent_id', e.target.value)}><option value="">None (Top-level)</option>{rows.filter(x => String(x.id) !== String(id) && (x.is_active || String(x.id) === String(form.parent_id))).map(x => <option value={x.id} key={x.id}>{x.name}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Emoji<input className={inputClass} maxLength="16" value={form.emoji} onChange={e => edit('emoji', e.target.value)}/></label><label className={labelClass}>Sort Order<input className={inputClass} type="number" min="-100000" max="100000" value={form.sort_order} onChange={e => edit('sort_order', e.target.value)}/></label></div><label className={labelClass}>Image URL<input className={inputClass} placeholder="https://... or /uploads/..." value={form.image_url} onChange={e => edit('image_url', e.target.value)}/></label></>}</section><aside className={`${cardClass} grid gap-4`}><h3 className="text-lg">Visibility</h3><label className="flex gap-2 text-sm"><input type="checkbox" checked={!!form.is_active} onChange={e => edit('is_active', e.target.checked)}/> Active</label><p className="text-xs leading-relaxed text-taupe-600">Archived records remain stored so historical orders and product links stay intact.</p><button className={mainButton} disabled={saving} type="submit">{saving ? 'Saving...' : editing ? 'Save Changes' : `Create ${title}`}</button><Link className={secondaryButton} href={`/admin/${entity}`}>Cancel</Link></aside></form>}</div>;
}
