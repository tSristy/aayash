'use strict';

/**
 * Combo = one main product plus free gift products, with a per-combo gift mode.
 * Incomplete orders from landing pages remember the page and the ad source.
 * Additive only: earlier migrations are never edited.
 */
async function hasColumn(q, table, column) {
  const [rows] = await q.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, { replacements: [column] });
  return rows.length > 0;
}

async function up(queryInterface) {
  const q = queryInterface.sequelize;
  const add = async (table, column, ddl) => {
    if (!(await hasColumn(q, table, column))) await q.query(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`);
  };

  // Existing combo lines stay "main" so current combos behave exactly as before.
  await add('combo_items', 'role', "`role` ENUM('main','gift') NOT NULL DEFAULT 'main'");
  // combo_only: gifts only inside the combo pack. with_main: every order of the main product also gets the gifts free.
  await add('products', 'gift_mode', "`gift_mode` ENUM('combo_only','with_main') NOT NULL DEFAULT 'combo_only'");

  await add('checkout_drafts', 'landing_page_id', '`landing_page_id` INT UNSIGNED NULL');
  await add('checkout_drafts', 'source_url', '`source_url` VARCHAR(500) NULL');
  await add('checkout_drafts', 'utm_source', '`utm_source` VARCHAR(120) NULL');
  await add('checkout_drafts', 'utm_medium', '`utm_medium` VARCHAR(120) NULL');
  await add('checkout_drafts', 'utm_campaign', '`utm_campaign` VARCHAR(190) NULL');
  await add('checkout_drafts', 'utm_content', '`utm_content` VARCHAR(190) NULL');
  await add('checkout_drafts', 'fbclid', '`fbclid` VARCHAR(255) NULL');
  await add('checkout_drafts', 'origin', "`origin` VARCHAR(20) NOT NULL DEFAULT 'checkout'");
}

async function down() {}

module.exports = { up, down };
