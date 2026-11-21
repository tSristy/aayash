'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { catalogRequest, cardClass, mainButton, Notice } from './catalogApi';
export default function AttributeView({ id }) {
    const [row, setRow] = useState(null), [err, setErr] = useState('');
    useEffect(() => { catalogRequest(`/attributes/${id}`).then(setRow).catch(e => setErr(e.message)); }, [id]);
    const options = row ? (typeof row.allowed_values_json === 'string' ? JSON.parse(row.allowed_values_json) : row.allowed_values_json || []) : [];
    return <div className="grid gap-5">
        <div>
            <Link href="/admin/attributes" className="text-sm text-primary-deep">← Back to Attributes</Link>
            <div className="mt-2 flex justify-between gap-3">
                <h2 className="text-xl">Attribute Details</h2>
                <Link href={`/admin/attributes/${id}/edit`} className={mainButton}>Edit</Link>
            </div>
        </div>
        <Notice error={err} />{row ?
            <div className={`${cardClass} grid max-w-3xl gap-5`}>
                <h3 className="text-lg">{row.name}</h3>
                <dl className="grid gap-4 text-sm sm:grid-cols-2">{[['Code', row.code], ['Data Type', row.data_type], ['Unit', row.unit || '—'], ['Status', row.is_active ? 'Active' : 'Archived']].map(([k, v]) => <div key={k}>
                    <dt className="text-taupe-600">{k}</dt>
                    <dd className="mt-1 font-medium">{v}</dd>
                </div>)}</dl>{options.length > 0 &&
                    <div>
                        <h4 className="font-medium">Choices</h4>
                        <p className="mt-2 text-sm text-taupe-700">{options.join(' · ')}</p>
                    </div>}</div> : !err ? <p>Loading...</p> : null}
    </div>;
}
