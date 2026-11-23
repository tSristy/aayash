'use strict';

require('dotenv').config();

const { DB } = require('../config');
const {
    CONFIRMATION_TOKEN,
    assertCatalogSeedAllowed,
    seedCatalog,
} = require('../seeders/catalog/seedCatalog');

async function main() {
    const confirmation = process.argv[2];
    const environment = {
        ...process.env,
        DB_HOST: DB.host,
        DB_NAME: DB.database,
    };

    // Intentionally opt-in, local-development only. Never seed during app startup.
    assertCatalogSeedAllowed(environment, confirmation);

    const models = require('../src/models');

    try {
        await models.sequelize.authenticate();
        await models.sequelize.query('SELECT 1 FROM product_types LIMIT 0');

        const result = await seedCatalog(models);

        console.log('\nAyashmart food catalog populated.');
        console.log('Database:', DB.database);
        console.log('Catalog totals:', JSON.stringify(result.target));
        console.log('New records:', JSON.stringify(result.inserted));
        console.log('Existing matching records were not overwritten.');
        console.log('Verify photos, prices, inventory and packaging information before live sales.');
    } finally {
        await models.sequelize.close();
    }
}

main().catch((error) => {
    console.error('[seed:catalog] Failed:', error.message);
    console.error(`Run migrations first, then: npm run seed:catalog -- ${CONFIRMATION_TOKEN}`);
    process.exitCode = 1;
});
