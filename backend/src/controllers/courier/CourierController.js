'use strict';

const { pool } = require('../../../db');
const { CourierProvider } = require('../../models');
const { Op } = require('sequelize');
const { COURIER_BOOKABLE } = require('../../services/orders/workflow');
const { validateProviderInput } = require('../../services/courier/provider-validation');
const { parseListQuery, paginationResult } = require('../../utils/catalog-pagination');
const {
  ACTIVE_SHIPMENT_STATUSES,
  canTransition,
  normalizeConsignment,
  validWeight,
} = require('../../services/courier/courier-policy');

class CourierError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function respond(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof CourierError) {
        return res.status(error.status).json({ error: error.message });
      }
      return next(error);
    }
  };
}

function orderIdFrom(params) {
  const id = Number(params.orderId);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new CourierError(400, 'Invalid order ID.');
  }
  return id;
}

function providerDto(provider) {
  return {
    id: provider.id,
    code: provider.code,
    name: provider.name,
    is_active: Boolean(provider.is_active),
    is_archived: Boolean(provider.is_archived),
    integration_mode: provider.api_enabled ? 'api' : 'manual',
    api_ready: Boolean(provider.api_enabled),
    contact_phone: provider.contact_phone || '',
    website_url: provider.website_url || '',
    tracking_url_template: provider.tracking_url_template || '',
    notes: provider.notes || '',
  };
}

function validProviderId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new CourierError(400, 'Invalid courier ID.');
  }
  return id;
}

function safeProviderInput(body, options) {
  try {
    return validateProviderInput(body, options);
  } catch (error) {
    throw new CourierError(error.status || 400, error.message);
  }
}

async function findProvider(id) {
  const provider = await CourierProvider.findByPk(validProviderId(id));
  if (!provider) {
    throw new CourierError(404, 'Courier provider not found.');
  }
  return provider;
}

const listProviders = respond(async (req, res) => {
  let list;
  try {
    list = parseListQuery(req.query);
  } catch (error) {
    throw new CourierError(error.status || 400, error.message);
  }
  const status = String(req.query.status || 'all');
  if (!['all', 'active', 'inactive', 'archived'].includes(status)) {
    throw new CourierError(400, 'Invalid courier status filter.');
  }

  const where = {};
  if (list.search) {
    const like = `${list.search.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    where[Op.or] = [
      { name: { [Op.like]: like } },
      { code: { [Op.like]: like } },
    ];
  }
  if (status === 'active') {
    where.is_active = true;
    where.is_archived = false;
  } else if (status === 'inactive') {
    where.is_active = false;
    where.is_archived = false;
  } else if (status === 'archived') {
    where.is_archived = true;
  }

  const result = await CourierProvider.findAndCountAll({
    where,
    order: [['id', 'ASC']],
    limit: list.limit,
    offset: list.offset,
  });
  res.json(paginationResult(result, list, result.rows.map(providerDto)));
});

// Used by all Courier dropdowns: options come from the database, never a
// hardcoded Steadfast / Pathao / REDX frontend list.
const providerOptions = respond(async (req, res) => {
  const scope = String(req.query.scope || 'active');
  if (!['active', 'all'].includes(scope)) {
    throw new CourierError(400, 'Invalid courier options scope.');
  }
  const where = scope === 'active' ? { is_active: true, is_archived: false } : {};
  const providers = await CourierProvider.findAll({
    where,
    order: [['name', 'ASC']],
  });
  res.json({ items: providers.map(providerDto) });
});

const getProvider = respond(async (req, res) => {
  const provider = await findProvider(req.params.id);
  res.json(providerDto(provider));
});

const createProvider = respond(async (req, res) => {
  const values = safeProviderInput(req.body, { creating: true });
  const existing = await CourierProvider.findOne({ where: { code: values.code } });
  if (existing) {
    throw new CourierError(409, 'Courier code already exists.');
  }
  try {
    const provider = await CourierProvider.create({ ...values, created_at: new Date(), updated_at: new Date() });
    res.status(201).json(providerDto(provider));
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new CourierError(409, 'Courier code already exists.');
    }
    throw error;
  }
});

const updateProvider = respond(async (req, res) => {
  const provider = await findProvider(req.params.id);
  if (provider.is_archived) {
    throw new CourierError(409, 'Restore an archived courier before editing it.');
  }
  const values = safeProviderInput(req.body);
  await provider.update({ ...values, updated_at: new Date() });
  res.json(providerDto(provider));
});

const archiveProvider = respond(async (req, res) => {
  const provider = await findProvider(req.params.id);
  if (!provider.is_archived) {
    await provider.update({ is_archived: true, is_active: false, updated_at: new Date() });
  }
  res.json(providerDto(provider));
});

const restoreProvider = respond(async (req, res) => {
  const provider = await findProvider(req.params.id);
  if (provider.is_archived) {
    // Deliberately keep it inactive; the Admin must explicitly reactivate it.
    await provider.update({ is_archived: false, is_active: false, updated_at: new Date() });
  }
  res.json(providerDto(provider));
});

const listShipments = respond(async (req, res) => {
  let list;
  try {
    list = parseListQuery(req.query);
  } catch (error) {
    throw new CourierError(error.status || 400, error.message);
  }

  const provider = String(req.query.provider || 'all');
  const status = String(req.query.status || 'all');
  const allowedStatuses = [
    'booked', 'picked_up', 'in_transit', 'delivered',
    'returning', 'returned', 'cancelled',
  ];

  if (provider !== 'all' && !/^[a-z][a-z0-9-]{1,39}$/.test(provider)) {
    throw new CourierError(400, 'Invalid courier provider filter.');
  }
  if (status !== 'all' && !allowedStatuses.includes(status)) {
    throw new CourierError(400, 'Invalid shipment status filter.');
  }

  const conditions = [];
  const params = [];

  if (list.search) {
    conditions.push(`(
      LOCATE(?, s.consignment_id) > 0 OR
      LOCATE(?, o.order_no) > 0 OR
      LOCATE(?, o.guest_phone) > 0
    )`);
    params.push(list.search, list.search, list.search);
  }
  if (provider !== 'all') {
    conditions.push('p.code = ?');
    params.push(provider);
  }
  if (status !== 'all') {
    conditions.push('s.status = ?');
    params.push(status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const base = `
    FROM courier_shipments s
    JOIN courier_providers p ON p.id = s.provider_id
    JOIN orders o ON o.id = s.order_id
    ${where}
  `;

  const [[count], [rows]] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total ${base}`, params),
    pool.query(`
      SELECT s.id, s.order_id, s.consignment_id, s.status,
             s.booking_mode, s.cod_amount, s.created_at,
             p.name AS courier_name, o.order_no, o.guest_name
      ${base}
      ORDER BY s.id DESC LIMIT ? OFFSET ?
    `, [...params, list.limit, list.offset]),
  ]);

  const total = Number(count[0]?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / list.limit));
  res.json({
    items: rows,
    page: list.page,
    limit: list.limit,
    total,
    totalPages,
    hasPreviousPage: list.page > 1,
    hasNextPage: list.page < totalPages,
  });
});

const getOrderShipments = respond(async (req, res) => {
  const orderId = orderIdFrom(req.params);
  const [rows] = await pool.query(`
    SELECT s.id, s.order_id, s.consignment_id, s.status,
           s.booking_mode, s.cod_amount, s.weight_kg, s.note,
           s.booked_at, s.created_at, p.name AS courier_name, p.code AS courier_code,
           p.tracking_url_template AS tracking_url_template
    FROM courier_shipments s
    JOIN courier_providers p ON p.id = s.provider_id
    WHERE s.order_id = ?
    ORDER BY s.id DESC
  `, [orderId]);

  const [events] = rows.length
    ? await pool.query(`
        SELECT id, shipment_id, provider_status, mapped_status,
               source, event_time, note
        FROM courier_tracking_events
        WHERE shipment_id IN (${rows.map(() => '?').join(',')})
        ORDER BY id DESC
      `, rows.map((row) => row.id))
    : [[]];

  res.json(rows.map((row) => ({
    ...row,
    events: events.filter((event) => Number(event.shipment_id) === Number(row.id)),
  })));
});

const createManualShipment = respond(async (req, res) => {
  const orderId = orderIdFrom(req.params);
  const providerId = Number(req.body?.provider_id);
  const consignment = normalizeConsignment(req.body?.consignment_id);
  const weightKg = validWeight(req.body?.weight_kg);
  const note = req.body?.note == null ? '' : String(req.body.note).trim();

  if (!Number.isSafeInteger(providerId) || providerId < 1 || !consignment) {
    throw new CourierError(400, 'Choose a courier and enter a valid consignment ID (4–120 characters).');
  }

  if (weightKg === undefined || note.length > 500) {
    throw new CourierError(400, 'Invalid parcel weight or instructions.');
  }

  const connection = await pool.getConnection();
  let inTransaction = false;

  try {
    await connection.beginTransaction();
    inTransaction = true;

    // Locking the order serializes two concurrent booking attempts.
    const [[order]] = await connection.query(`
      SELECT id, status, total, payment_method, payment_status
      FROM orders WHERE id = ? FOR UPDATE
    `, [orderId]);

    if (!order) {
      throw new CourierError(404, 'Order not found.');
    }
    if (!COURIER_BOOKABLE.includes(order.status)) {
      throw new CourierError(409, 'Confirm the order before booking a courier shipment.');
    }

    const [[provider]] = await connection.query(`
      SELECT id, code FROM courier_providers
      WHERE id = ? AND is_active = 1 AND is_archived = 0
    `, [providerId]);

    if (!provider) {
      throw new CourierError(400, 'Courier is unavailable or inactive.');
    }

    const [active] = await connection.query(`
      SELECT id FROM courier_shipments
      WHERE order_id = ? AND status IN (?, ?, ?, ?)
      LIMIT 1
    `, [orderId, ...ACTIVE_SHIPMENT_STATUSES]);

    if (active.length > 0) {
      throw new CourierError(409, 'An active shipment already exists for this order.');
    }

    const cod = order.payment_method === 'cod' && order.payment_status !== 'paid'
      ? Number(order.total)
      : 0;

    const [created] = await connection.query(`
      INSERT INTO courier_shipments (
        order_id, provider_id, consignment_id, status, booking_mode,
        cod_amount, weight_kg, note, created_by_admin_id, booked_at
      ) VALUES (?, ?, ?, 'booked', 'manual', ?, ?, ?, ?, NOW())
    `, [orderId, providerId, consignment, cod, weightKg, note || null, req.adminUser.id]);

    await connection.query(`
      INSERT INTO courier_tracking_events (
        shipment_id, mapped_status, source, note, created_by_admin_id
      ) VALUES (?, 'booked', 'manual', ?, ?)
    `, [created.insertId, 'Manually booked on courier merchant portal.', req.adminUser.id]);

    await connection.commit();
    inTransaction = false;
    res.status(201).json({ id: created.insertId, status: 'booked', consignment_id: consignment });
  } catch (error) {
    if (inTransaction) {
      await connection.rollback();
    }

    if (error.code === 'ER_DUP_ENTRY') {
      throw new CourierError(409, 'This courier consignment ID has already been recorded.');
    }
    throw error;
  } finally {
    connection.release();
  }
});

const changeShipmentStatus = respond(async (req, res) => {
  const id = Number(req.params.id);
  const nextStatus = req.body?.status;
  const note = req.body?.note == null ? '' : String(req.body.note).trim();

  if (!Number.isSafeInteger(id) || id < 1 || typeof nextStatus !== 'string' || note.length > 500) {
    throw new CourierError(400, 'Invalid shipment status request.');
  }

  const connection = await pool.getConnection();
  let inTransaction = false;

  try {
    await connection.beginTransaction();
    inTransaction = true;

    const [[shipment]] = await connection.query(`
      SELECT s.id, s.status, s.booking_mode, o.status AS order_status
      FROM courier_shipments s
      JOIN orders o ON o.id = s.order_id
      WHERE s.id = ? FOR UPDATE
    `, [id]);

    if (!shipment) {
      throw new CourierError(404, 'Shipment not found.');
    }
    if (shipment.booking_mode !== 'manual') {
      throw new CourierError(409, 'API shipments cannot be manually overwritten.');
    }
    if (!canTransition(shipment.status, nextStatus)) {
      throw new CourierError(409, 'Invalid courier status transition.');
    }

    await connection.query(`
      UPDATE courier_shipments SET status = ?, updated_at = NOW() WHERE id = ?
    `, [nextStatus, id]);
    await connection.query(`
      INSERT INTO courier_tracking_events (
        shipment_id, mapped_status, source, note, created_by_admin_id
      ) VALUES (?, ?, 'manual', ?, ?)
    `, [id, nextStatus, note || null, req.adminUser.id]);

    await connection.commit();
    inTransaction = false;
    res.json({ id, status: nextStatus });
  } catch (error) {
    if (inTransaction) {
      await connection.rollback();
    }
    throw error;
  } finally {
    connection.release();
  }
});

module.exports = {
  listProviders,
  providerOptions,
  getProvider,
  createProvider,
  listShipments,
  updateProvider,
  archiveProvider,
  restoreProvider,
  getOrderShipments,
  createManualShipment,
  changeShipmentStatus,
};
