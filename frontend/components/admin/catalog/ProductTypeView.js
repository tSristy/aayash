'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { catalogRequest, cardClass, Notice, mainButton } from './catalogApi';
export default function ProductTypeView({ id }) {
    const [row, setRow] = useState(null), [err, setErr] = useState('');
    useEffect(() => { catalogRequest(`/product-types/${id}`).then(setRow).catch(e => setErr(e.message)); }, [id]);
    return <div className="grid gap-5"><div><Link className="text-sm text-primary-deep hover:underline" href="/admin/product-types">← Back to Product Types</Link><div className="mt-2 flex justify-between gap-3"><h2 className="text-xl">Product Type Details</h2><Link className={mainButton} href={`/admin/product-types/${id}/edit`}>Edit Template</Link></div></div><Notice error={err}/>{row ? <><section className={cardClass}><h3 className="text-lg">{row.name}</h3><p className="mt-1 text-sm text-taupe-600">Code: {row.code} · {row.is_active ? 'Active' : 'Archived'}</p><p className="mt-3 text-sm">{row.description || 'No description.'}</p></section><section className={cardClass}><h3 className="mb-4 text-lg">Assigned Attributes ({row.attributeAssignments.length})</h3><div className="grid gap-2">{row.attributeAssignments.length ? row.attributeAssignments.map(a => <div key={a.attribute_id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-taupe-200 p-3 text-sm"><span className="font-medium">{a.attribute?.name}</span><span className="text-taupe-600">{a.group_name} · {a.is_required ? 'Required' : 'Optional'} · {a.attribute?.data_type}</span></div>) : <p className="text-sm text-taupe-600">No fields assigned yet.</p>}</div></section></> : !err ? <p>Loading...</p> : null}</div>;
}
