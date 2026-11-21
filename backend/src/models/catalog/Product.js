'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CatalogProduct', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
    },
    product_type_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
    },
    category_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    brand_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
    },
    slug: {
        type: DataTypes.STRING(220),
        allowNull: false,
        unique: true,
    },
    short_desc: {
        type: DataTypes.STRING(300),
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    image_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    emoji: {
        type: DataTypes.STRING(16),
        allowNull: true,
    },
    is_featured: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    status: {
        type: DataTypes.ENUM('draft', 'active', 'archived'),
        allowNull: false,
        defaultValue: 'draft',
    },
}, {
    tableName: 'products',
    timestamps: false,
});
