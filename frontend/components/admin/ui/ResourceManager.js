'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, del, post, put, qs, useDebounced, useFetch } from '@/lib/admin-api';
import { useAdmin } from '../AdminContext';
import ImageField from './ImageField';
import RichText from './RichText';
import { Alert, Btn, Card, Input, Modal, PageHeader, Pagination, SearchBox, Select, Table, Textarea, Toggle, useConfirm, useToast, Badge, IconBtn } from './kit';

/** Options for a select: static list, or loaded from an endpoint. */
function useOptions(field) {
  const src = field.optionsFrom;
  const { data } = useFetch(src?.endpoint, src?.query, !!src);
  return useMemo(() => {
    if (field.options) return field.options;
    if (!src || !data) return [];
    const list = (src.path ? data[src.path] : data.items || data) || [];
    return list.map((r) => ({ value: String(r[src.value || 'id']), label: r[src.label || 'name'] }));
  }, [field.options, src, data]);
}

function FieldInput({ field, values, set, errors }) {
  const options = useOptions(field);
  const v = values[field.name];
  const common = { label: field.label, help: field.help, required: field.required, error: errors?.[field.name], wrap: field.span === 2 ? 'sm:col-span-2' : '' };
  switch (field.type) {
    case 'toggle': return <div className={field.span === 2 ? 'sm:col-span-2' : ''}><Toggle checked={!!v} onChange={(x) => set(field.name, x)} label={field.label} help={field.help} /></div>;
    case 'textarea': return <Textarea {...common} rows={field.rows || 4} value={v ?? ''} onChange={(e) => set(field.name, e.target.value)} placeholder={field.placeholder} className={field.mono ? 'font-mono text-xs' : ''} />;
    case 'select': return <Select {...common} options={options} placeholder={field.required ? 'Choose…' : '— none —'} value={v ?? ''} onChange={(e) => set(field.name, e.target.value)} />;
    case 'richtext': return <RichText label={field.label} help={field.help} value={v ?? ''} onChange={(x) => set(field.name, x)} />;
    case 'image': return <div className={field.span === 2 ? 'sm:col-span-2' : ''}><ImageField label={field.label} value={v} onChange={(x) => set(field.name, x)} help={field.help} /></div>;
    case 'color': return <Input {...common} type="color" className="h-11 p-1" value={v || '#FF9933'} onChange={(e) => set(field.name, e.target.value)} />;
    case 'number': return <Input {...common} type="number" step={field.step || '1'} min={field.min} value={v ?? ''} onChange={(e) => set(field.name, e.target.value)} placeholder={field.placeholder} />;
    case 'date': return <Input {...common} type="date" value={v ? String(v).slice(0, 10) : ''} onChange={(e) => set(field.name, e.target.value)} />;
    default: return <Input {...common} type={field.type || 'text'} value={v ?? ''} onChange={(e) => set(field.name, e.target.value)} placeholder={field.placeholder} maxLength={field.max} />;
  }
}

/**
 * Config-driven list + create/edit dialog for master data.
 * Props: endpoint (relative to /api/admin), columns, fields, filters, writePerm, rowActions, toForm, toPayload.
 */
export default function ResourceManager({
  title, subtitle, endpoint, columns, fields, filters = [], searchable = true, searchPlaceholder = 'Search…', defaults = {},
  writePerm, canDelete = true, createLabel = 'Add new', rowActions, toForm, toPayload, pageSize = 20, noun = 'item', headerExtra, emptyText, modalWidth, afterSave, query: extraQuery, openNew,
}) {
  const { can } = useAdmin();
  const toast = useToast();
  const [ask, confirmNode] = useConfirm();
  const writable = !writePerm || can(...[].concat(writePerm));
  const [search, setSearch] = useState('');
  const [filterVals, setFilterVals] = useState({});
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const { data, loading, error, reload } = useFetch(endpoint, { q: q || undefined, page, limit: pageSize, ...filterVals, ...extraQuery });
  const [editing, setEditing] = useState(null);
  useEffect(() => setPage(1), [q, filterVals]);
  useEffect(() => { if (openNew && writable) setEditing({ __new: true, ...defaults }); /* eslint-disable-next-line */ }, [openNew]);

  const cols = [...columns];
  if (writable || rowActions) {
    cols.push({
      key: '_actions', label: '', align: 'right', render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {rowActions?.(row, reload)}
          {writable && <IconBtn icon="edit" label={`Edit ${noun}`} onClick={() => setEditing({ ...(toForm ? toForm(row) : row) })} />}
          {writable && canDelete && (typeof canDelete === 'function' ? canDelete(row) : true) && <IconBtn icon="trash" label={`Delete ${noun}`} onClick={async () => {
            if (!(await ask({ title: `Delete this ${noun}?`, message: 'This cannot be undone.', confirmLabel: 'Delete' }))) return;
            try { await del(`${endpoint}/${row.id}`); toast(`${noun[0].toUpperCase()}${noun.slice(1)} deleted`); reload(); } catch (e) { toast(e.message, 'error'); }
          }} />}
        </div>
      ),
    });
  }

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} actions={<>{headerExtra}{writable && <Btn icon="plus" onClick={() => setEditing({ __new: true, ...defaults })}>{createLabel}</Btn>}</>} />
      <Card pad={false}>
        {(searchable || filters.length > 0) && (
          <div className="flex flex-wrap items-center gap-3 p-4 pb-2">
            {searchable && <SearchBox value={search} onChange={setSearch} placeholder={searchPlaceholder} className="w-full sm:w-72" />}
            {filters.map((f) => (
              <select key={f.name} aria-label={f.label} value={filterVals[f.name] || ''} onChange={(e) => setFilterVals((s) => ({ ...s, [f.name]: e.target.value }))} className="rounded-full bg-taupe-100 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                <option value="">{f.label}: all</option>
                {(f.options || []).map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
              </select>
            ))}
          </div>
        )}
        {error && <div className="px-4"><Alert>{error}</Alert></div>}
        <div className="px-2 pb-2">
          <Table columns={cols} rows={data?.items} loading={loading} empty={emptyText || `No ${noun}s yet.`} />
          {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}
        </div>
      </Card>
      {editing && (
        <EditDialog endpoint={endpoint} fields={fields} initial={editing} noun={noun} width={modalWidth} toPayload={toPayload}
          onClose={() => setEditing(null)} onSaved={(row) => { setEditing(null); toast(`${noun[0].toUpperCase()}${noun.slice(1)} saved`); reload(); afterSave?.(row); }} />
      )}
      {confirmNode}
    </>
  );
}

function EditDialog({ endpoint, fields, initial, noun, onClose, onSaved, width, toPayload }) {
  const isNew = !!initial.__new;
  const [values, setValues] = useState(() => {
    const o = { ...initial }; delete o.__new;
    for (const f of fields) if (o[f.name] === undefined || o[f.name] === null) o[f.name] = f.type === 'toggle' ? (f.default ?? true) : (f.default ?? '');
    return o;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const body = {};
      for (const f of fields) {
        let v = values[f.name];
        if (f.type === 'toggle') v = v ? 1 : 0;
        else if (v === '' || v === undefined) v = null;
        body[f.name] = v;
      }
      const payload = toPayload ? toPayload(body, values) : body;
      const row = isNew ? await post(endpoint, payload) : await put(`${endpoint}/${initial.id}`, payload);
      onSaved(row);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <Modal title={`${isNew ? 'Add' : 'Edit'} ${noun}`} onClose={onClose} width={width || 'max-w-xl'}
      footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn type="submit" form="resource-form" loading={busy}>Save</Btn></>}>
      <form id="resource-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
        {fields.filter((f) => !(f.hideOnEdit && !isNew) && !(f.hideOnNew && isNew)).map((f) => <FieldInput key={f.name} field={f} values={values} set={set} errors={null} />)}
      </form>
    </Modal>
  );
}

export const ActiveBadge = ({ on }) => <Badge tone={on ? 'green' : 'gray'}>{on ? 'Active' : 'Off'}</Badge>;
export { qs, api };
