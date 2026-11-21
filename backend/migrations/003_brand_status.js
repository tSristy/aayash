'use strict';
const { DataTypes } = require('sequelize');
// Additive migration: never changes brand names/IDs, does not touch products.
module.exports.up = async (queryInterface) => {
  const columns = await queryInterface.describeTable('brands');
  if (!Object.keys(columns).some(k => k.toLowerCase() === 'is_active')) {
    await queryInterface.addColumn('brands', 'is_active', {
      type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true,
    });
  }
};
