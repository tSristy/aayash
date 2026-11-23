'use strict';

/**
 * One-time cleanup of the original 006 courier seed rows.
 *
 * Historical migrations must never be edited after being applied because the
 * migration runner checks their checksums. This new migration removes the
 * original three default rows when they have NO references, while archiving
 * referenced rows to preserve shipment/API/webhook history.
 *
 * Custom courier rows created by Admin are untouched.
 * This migration never inserts or activates a courier.
 */
async function up(queryInterface) {
  const sequelize = queryInterface.sequelize;
  const transaction = await sequelize.transaction();

  try {
    await sequelize.query(`
      UPDATE courier_providers p
      SET p.is_active = 0,
          p.is_archived = 1,
          p.updated_at = NOW()
      WHERE p.code IN ('steadfast', 'pathao', 'redx')
        AND (
          EXISTS (
            SELECT 1 FROM courier_shipments s WHERE s.provider_id = p.id
          ) OR EXISTS (
            SELECT 1 FROM courier_api_requests r WHERE r.provider_id = p.id
          ) OR EXISTS (
            SELECT 1 FROM courier_webhook_events w WHERE w.provider_id = p.id
          )
        )
    `, { transaction });

    await sequelize.query(`
      DELETE p FROM courier_providers p
      WHERE p.code IN ('steadfast', 'pathao', 'redx')
        AND NOT EXISTS (
          SELECT 1 FROM courier_shipments s WHERE s.provider_id = p.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM courier_api_requests r WHERE r.provider_id = p.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM courier_webhook_events w WHERE w.provider_id = p.id
        )
    `, { transaction });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = { up };
