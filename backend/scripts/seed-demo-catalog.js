'use strict';

require('dotenv').config();

const { DB } = require('../config');
const {
    CONFIRMATION_TOKEN,
    assertDemoSeedAllowed,
    seedDemoCatalog,
} = require('../seeders/demo/seedCatalog');

async function main() {
    const confirmation = process.argv[2];
    const env = {
        ...process.env,
        DB_HOST: DB.host,
        DB_NAME: DB.database,
    };

    // Refuse to connect if the operator has not explicitly acknowledged
    // that this is a local development-only demo data operation.
    assertDemoSeedAllowed(env, confirmation);

    const models = require('../src/models');

    try {
        await models.sequelize.authenticate();
        await models.sequelize.query('SELECT 1 FROM product_types LIMIT 0');

        const result = await seedDemoCatalog(models);

        console.log('\nAyashmart demo catalog seed completed.');
        console.log('Database:', DB.database);
        console.log('Target records:', JSON.stringify(result.target));
        console.log('New records inserted:', JSON.stringify(result.inserted));
        console.log('Existing demo records were preserved, not overwritten.');
    } finally {
        await models.sequelize.close();
    }
}

main().catch((error) => {
    console.error('[seed:demo] Failed:', error.message);
    console.error(`Run migrations first, then: npm run seed:demo -- ${CONFIRMATION_TOKEN}`);
    process.exitCode = 1;
});
