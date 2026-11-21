'use client';

import { loadCatalogChoices } from './catalogLookups';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { catalogRequest, Notice, inputClass, labelClass, mainButton, secondaryButton, cardClass, fieldCode } from './catalogApi';
export default function ProductTypeForm({ id }) {
    const router = useRouter(), editing = !!id;
    const [f, setF] = useState({ name: '', code: '', description: '', is_active: true }), [attrs, setAttrs] = useState([]), [selected, setSelected] = useState([]), [error, setError] = useState(''), [saving, setSaving] = useState(false), [loading, setLoading] = useState(true), [touched, setTouched] = useState(editing), [filter, setFilter] = useState('');
    useEffect(() => { let ok = true; (async () => { try {
        const [all, detail] = await Promise.all([loadCatalogChoices('attributes'), editing ? catalogRequest(`/product-types/${id}`) : Promise.resolve(null)]);
        if (!ok)
            return;
        setAttrs(all);
        if (detail) {
            setF(detail);
            setSelected(detail.attributeAssignments.map(a => ({ attribute_id: a.attribute_id, group_name: a.group_name, is_required: !!a.is_required, is_filterable: !!a.is_filterable, is_visible: !!a.is_visible, sort_order: a.sort_order })));
        }
    }
    catch (e) {
        if (ok)
            setError(e.message);
    }
    finally {
        if (ok)
            setLoading(false);
    } })(); return () => { ok = false; }; }, [id, editing]);
    const visible = useMemo(() => attrs.filter(a => (a.name + ' ' + a.code).toLowerCase().includes(filter.toLowerCase())), [attrs, filter]);
    const toggle = attr => setSelected(old => old.some(x => x.attribute_id === attr.id) ? old.filter(x => x.attribute_id !== attr.id) : [...old, { attribute_id: attr.id, group_name: 'General', is_required: false, is_filterable: false, is_visible: true, sort_order: old.length }]);
    const patch = (attrId, k, v) => setSelected(old => old.map(x => x.attribute_id === attrId ? { ...x, [k]: v } : x));
    async function submit(e) { e.preventDefault(); setSaving(true); setError(''); let record = null; try {
        record = await catalogRequest(editing ? `/product-types/${id}` : '/product-types', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify({ name: f.name, code: f.code, description: f.description || null, is_active: !!f.is_active }) });
        await catalogRequest(`/product-types/${record.id}/attributes`, { method: 'PUT', body: JSON.stringify({ attributes: selected }) });
        router.push(`/admin/product-types/${record.id}`);
        router.refresh();
    }
    catch (e) {
        setError(`${e.message}${record && !editing ? ` Product Type #${record.id} was created; open its edit page to finish attribute assignment.` : ''}`);
    }
    finally {
        setSaving(false);
    } }
    return <div className="grid gap-5"><div><Link href="/admin/product-types" className="text-sm text-primary-deep hover:underline">← Back to Product Types</Link><h2 className="mt-2 text-xl">{editing ? 'Edit' : 'Create'} Product Type</h2><p className="text-sm text-taupe-600">Configure form fields once and reuse the template for many products.</p></div><Notice error={error}/>{loading ? <p>Loading...</p> : <form onSubmit={submit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]"><div className="grid gap-5"><section className={`${cardClass} grid gap-4`}><h3 className="text-lg">Template Details</h3><label className={labelClass}>Name *<input className={inputClass} required value={f.name} onChange={e => { const v = e.target.value; setF(p => ({ ...p, name: v, code: touched ? p.code : fieldCode(v) })); }}/></label><label className={labelClass}>Code *<input className={inputClass} required pattern="[a-z][a-z0-9_]*" value={f.code} onChange={e => { setTouched(true); setF(p => ({ ...p, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })); }}/></label><label className={labelClass}>Description<textarea rows={3} className={inputClass} value={f.description || ''} onChange={e => setF(p => ({ ...p, description: e.target.value }))}/></label></section><section className={`${cardClass} grid gap-4`}><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg">Specification Fields</h3><p className="text-xs text-taupe-600">Check an attribute to assign it to this template.</p></div><Link className={secondaryButton} href="/admin/attributes/new">+ Create Attribute</Link></div><input className={inputClass} aria-label="Filter attributes" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Find an attribute..."/>{visible.length === 0 && <p className="text-sm text-taupe-600">No attributes yet. Create one first.</p>}{visible.map(a => { const assignment = selected.find(x => x.attribute_id === a.id); return <div key={a.id} className="rounded-xl border border-taupe-200 p-4"><label className="flex items-center gap-2 font-medium text-sm"><input type="checkbox" checked={!!assignment} onChange={() => toggle(a)} disabled={!a.is_active && !assignment}/> {a.name}<span className="ml-auto text-xs font-normal text-taupe-600">{a.data_type}</span></label>{assignment && <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"><label className={labelClass}>Group<input className={inputClass} value={assignment.group_name} onChange={e => patch(a.id, 'group_name', e.target.value)}/></label>{[['is_required', 'Required'], ['is_visible', 'Visible'], ['is_filterable', 'Filterable']].map(([k, l]) => <label key={k} className="flex items-center gap-2 self-end pb-3 text-xs"><input type="checkbox" checked={assignment[k]} onChange={e => patch(a.id, k, e.target.checked)}/>{l}</label>)}</div>}</div>; })}</section></div><aside className={`${cardClass} grid gap-4`}><h3 className="text-lg">Template Status</h3><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.is_active} onChange={e => setF(p => ({ ...p, is_active: e.target.checked }))}/> Active for new products</label><div className="rounded-xl bg-taupe-50 p-3 text-sm"><span className="font-medium">{selected.length}</span> fields assigned</div><button className={mainButton} disabled={saving} type="submit">{saving ? 'Saving...' : editing ? 'Save Template' : 'Create Template'}</button><Link className={secondaryButton} href="/admin/product-types">Cancel</Link></aside></form>}</div>;
}
