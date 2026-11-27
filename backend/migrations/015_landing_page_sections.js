'use strict';

/** Extra landing-page sections for the mobile-first ad page. Additive only. */
const COLUMNS = [
  ['badge', 'VARCHAR(80) NULL'],
  ['benefits', 'TEXT NULL'],        // lines: Title | short text
  ['gallery', 'TEXT NULL'],         // JSON: [{ image_url, caption }]
  ['reviews', 'TEXT NULL'],         // lines: Name | rating 1-5 | review text
  ['faq', 'TEXT NULL'],             // lines: Question | Answer
  ['offer_ends_at', 'DATETIME NULL'],
  ['offer_note', 'VARCHAR(160) NULL'],
];

async function up(queryInterface) {
  const q = queryInterface.sequelize;
  for (const [name, ddl] of COLUMNS) {
    const [rows] = await q.query('SHOW COLUMNS FROM `landing_pages` LIKE ?', { replacements: [name] });
    if (!rows.length) await q.query(`ALTER TABLE \`landing_pages\` ADD COLUMN \`${name}\` ${ddl}`);
  }
  // Tell customers about incomplete-order drafts in the privacy page (only if the page still has the original seeded text; edited pages are left alone and the shop owner should add the sentence).
  await q.query(
    "UPDATE cms_pages SET body = CONCAT(body, ?) WHERE slug = 'privacy-policy' AND body = 'We collect only the information needed to deliver your order and never sell your personal data.'",
    { replacements: ['\n\nIf you start filling in an order form and do not finish it, we keep what you typed (such as your name, phone number and address) and which page and advert you came from, so our team can follow up and help you complete the order. You can ask us to delete it at any time.'] },
  );
}

async function down() {}

module.exports = { up, down };
