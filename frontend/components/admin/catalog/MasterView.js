'use client';

import { loadCatalogChoices } from './catalogLookups';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { catalogRequest, cardClass, secondaryButton, mainButton, Notice } from './catalogApi';
export default function MasterView({ entity, id }) {
    const [row, setRow] = useState(null), [parents, setParents] = useState([]), [error, setError] = useState('');
    useEffect(() => { (async () => { try {
        const r = await catalogRequest(`/${entity}/${id}`);
        setRow(r);
        if (entity === 'categories')
            setParents(await loadCatalogChoices('categories'));
    }
    catch (e) {
        setError(e.message);
    } })(); }, [entity, id]);
    const label = entity === 'categories' ? 'Category' : 'Brand';
    return <div className="grid gap-5"><div><Link href={`/admin/${entity}`} className="text-sm text-primary-deep hover:underline">← Back to {entity}</Link><div className="mt-2 flex flex-wrap justify-between gap-3"><div><h2 className="text-xl">{label} Details</h2><p className="text-sm text-taupe-600">Read-only record information</p></div><Link className={mainButton} href={`/admin/${entity}/${id}/edit`}>Edit {label}</Link></div></div><Notice error={error}/>{!row && !error ? <p>Loading...</p> : row ? <section className={`${cardClass} max-w-3xl`}><h3 className="mb-5 text-lg">{row.emoji || ''} {row.name}</h3><dl className="grid gap-4 text-sm sm:grid-cols-2">{[['ID', row.id], ['Name', row.name], ['Slug', row.slug], ['Status', row.is_active ? 'Active' : 'Archived'], ...(entity === 'categories' ? [['Parent Category', parents.find(x => x.id === row.parent_id)?.name || 'Top-level'], ['Sort Order', row.sort_order], ['Image URL', row.image_url || '—']] : [])].map(([key, val]) => <div key={key}><dt className="text-taupe-600">{key}</dt><dd className="mt-1 font-medium break-all">{val}</dd></div>)}</dl><Link className={`${secondaryButton} mt-7`} href={`/admin/${entity}`}>All {entity}</Link></section> : null}</div>;
}
