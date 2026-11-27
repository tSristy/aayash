'use strict';

/** Brand logos for the storefront brand row and Brands page, plus the new storefront colour defaults. Additive only. */
async function up(queryInterface) {
  const q = queryInterface.sequelize;
  const [rows] = await q.query("SHOW COLUMNS FROM `brands` LIKE 'logo_url'");
  if (!rows.length) await q.query('ALTER TABLE `brands` ADD COLUMN `logo_url` VARCHAR(500) NULL');
  // Storefront palette: move untouched old defaults to the new ones. Anything the admin changed is left alone.
  await q.query("UPDATE site_settings SET setting_value = '#FF9933' WHERE setting_key = 'theme_accent' AND setting_value = '#A65A3E'");
  await q.query("UPDATE site_settings SET setting_value = '#5E2409' WHERE setting_key = 'theme_footer_bg' AND setting_value = '#5D3D29'");
}

async function down() {}

module.exports = { up, down };
