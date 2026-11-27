'use client';
import { useState } from 'react';
import ResourceManager, { ActiveBadge } from '@/components/admin/ui/ResourceManager';
import { Tabs } from '@/components/admin/ui/kit';
import { taka } from '@/lib/format';

export default function Delivery() {
  const [tab, setTab] = useState('zones');
  return (<>
    <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ value: 'zones', label: 'Zones & charges' }, { value: 'cities', label: 'Cities' }, { value: 'areas', label: 'Areas' }]} />
    {tab === 'zones' && <ResourceManager title="Delivery zones" subtitle="Each zone has one delivery charge, e.g. Inside Dhaka and Outside Dhaka." endpoint="/ops/locations/zones" noun="zone" writePerm="locations.manage" searchable={false} createLabel="Add zone"
      columns={[{ label: 'Zone', render: (z) => <b>{z.name}</b> }, { label: 'Charge', align: 'right', render: (z) => taka(z.charge) }, { label: 'Cities', align: 'right', key: 'city_count' }, { label: 'Status', render: (z) => <ActiveBadge on={z.is_active} /> }]}
      fields={[{ name: 'name', label: 'Name', required: true }, { name: 'code', label: 'Code', required: true, help: 'Lowercase letters, numbers, underscore.' }, { name: 'charge', label: 'Delivery charge (৳)', type: 'number', step: '0.01', required: true }, { name: 'sort_order', label: 'Order', type: 'number' }, { name: 'is_active', label: 'Active', type: 'toggle' }]} defaults={{ sort_order: 0, is_active: true }} />}
    {tab === 'cities' && <ResourceManager title="Cities / districts" subtitle="Leave the override empty to use the zone's charge." endpoint="/ops/locations/cities" noun="city" writePerm="locations.manage" createLabel="Add city"
      filters={[{ name: 'zone_id', label: 'Zone', optionsFrom: { endpoint: '/ops/locations/zone-options', path: 'items' } }]}
      columns={[{ label: 'City', render: (c) => <b>{c.name}</b> }, { label: 'Zone', key: 'zone_name' }, { label: 'Charge', align: 'right', render: (c) => <span>{taka(c.effective_charge)}{c.charge_override != null && <span className="text-xs text-primary-deep"> override</span>}</span> }, { label: 'Areas', align: 'right', key: 'area_count' }, { label: 'Status', render: (c) => <ActiveBadge on={c.is_active} /> }]}
      fields={[{ name: 'name', label: 'Name', required: true }, { name: 'zone_id', label: 'Zone', type: 'select', required: true, optionsFrom: { endpoint: '/ops/locations/zone-options', path: 'items' } }, { name: 'charge_override', label: 'Charge override (৳)', type: 'number', step: '0.01' }, { name: 'is_active', label: 'Active', type: 'toggle' }]} defaults={{ is_active: true }} />}
    {tab === 'areas' && <ResourceManager title="Areas" subtitle="Thana / area inside a city." endpoint="/ops/locations/areas" noun="area" writePerm="locations.manage" createLabel="Add area"
      filters={[{ name: 'city_id', label: 'City', optionsFrom: { endpoint: '/ops/locations/city-options', path: 'items' } }]}
      columns={[{ label: 'Area', render: (a) => <b>{a.name}</b> }, { label: 'City', key: 'city_name' }, { label: 'Charge override', align: 'right', render: (a) => (a.charge_override != null ? taka(a.charge_override) : '—') }, { label: 'Status', render: (a) => <ActiveBadge on={a.is_active} /> }]}
      fields={[{ name: 'name', label: 'Name', required: true }, { name: 'city_id', label: 'City', type: 'select', required: true, optionsFrom: { endpoint: '/ops/locations/city-options', path: 'items' } }, { name: 'charge_override', label: 'Charge override (৳)', type: 'number', step: '0.01' }, { name: 'is_active', label: 'Active', type: 'toggle' }]} defaults={{ is_active: true }} />}
  </>);
}
