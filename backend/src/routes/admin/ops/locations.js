'use strict';

const express = require('express');
const { pool } = require('../../../../db');
const { requirePermission } = require('../../../auth/access');
const { crudRouter } = require('../../../lib/crud');
const { route, intParam } = require('../../../lib/http');

const router = express.Router();
router.use(requirePermission('locations.manage'));

router.use('/zones', crudRouter({
  table: 'delivery_zones', entity: 'delivery_zone', searchColumns: ['name', 'code'], orderBy: 't.sort_order, t.id',
  select: 't.*, (SELECT COUNT(*) FROM delivery_cities c WHERE c.zone_id = t.id) AS city_count',
  fields: [
    { name: 'code', required: true, max: 40, pattern: /^[a-z][a-z0-9_]{1,39}$/, label: 'Code' }, { name: 'name', required: true, max: 120 },
    { name: 'charge', type: 'num', required: true, label: 'Delivery charge' }, { name: 'sort_order', type: 'int', default: 0 }, { name: 'is_active', type: 'bool', default: 1 },
  ],
}));

router.use('/cities', crudRouter({
  table: 'delivery_cities', entity: 'delivery_city', searchColumns: ['name'], orderBy: 't.name', filters: { zone_id: 'zone_id' },
  join: 'JOIN delivery_zones z ON z.id = t.zone_id',
  select: 't.*, z.name AS zone_name, z.charge AS zone_charge, COALESCE(t.charge_override, z.charge) AS effective_charge, (SELECT COUNT(*) FROM delivery_areas a WHERE a.city_id = t.id) AS area_count',
  fields: [
    { name: 'zone_id', type: 'fk', required: true, label: 'Zone' }, { name: 'name', required: true, max: 120 },
    { name: 'charge_override', type: 'num', label: 'Charge override' }, { name: 'is_active', type: 'bool', default: 1 },
  ],
}));

router.use('/areas', crudRouter({
  table: 'delivery_areas', entity: 'delivery_area', searchColumns: ['name'], orderBy: 't.name', filters: { city_id: 'city_id' },
  join: 'JOIN delivery_cities c ON c.id = t.city_id',
  select: 't.*, c.name AS city_name',
  fields: [
    { name: 'city_id', type: 'fk', required: true, label: 'City' }, { name: 'name', required: true, max: 120 },
    { name: 'charge_override', type: 'num', label: 'Charge override' }, { name: 'is_active', type: 'bool', default: 1 },
  ],
}));

router.get('/zone-options', route(async (_req, res) => {
  const [rows] = await pool.query('SELECT id, name, charge FROM delivery_zones ORDER BY sort_order, id');
  res.json({ items: rows });
}));
router.get('/city-options', route(async (req, res) => {
  const [rows] = await pool.query('SELECT id, name FROM delivery_cities ORDER BY name LIMIT 500');
  res.json({ items: rows });
}));

module.exports = router;
