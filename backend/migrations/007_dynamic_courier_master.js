'use strict';

/**
 * Additive courier master fields. Existing Steadfast/Pathao/REDX rows and all
 * historical shipments are preserved. This migration does not seed, delete,
 * archive or activate any courier.
 */
async function up(queryInterface) {
  const { DataTypes } = require('sequelize');
  const columns = await queryInterface.describeTable('courier_providers');

  const additions = {
    is_archived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    contact_phone: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    website_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    tracking_url_template: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    notes: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  };

  for (const [name, definition] of Object.entries(additions)) {
    if (!columns[name]) {
      await queryInterface.addColumn('courier_providers', name, definition);
    }
  }
}

module.exports = { up };
