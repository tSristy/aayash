'use strict';

const express = require('express');
const cors = require('cors');
const { pool } = require('./db');
const { PORT, CORS_ORIGIN } = require('./config');
const { sequelize } = require('./src/db/sequelize');
const { runMigrations, shouldMigrateOnStart } = require('./src/db/migration-runner');
const adminAuthRouter = require('./src/routes/admin-auth');
const adminCatalogRouter = require('./src/routes/admin-catalog');
const adminOrderRouter = require('./src/routes/orders/admin-orders');
const courierRoutes = require('./src/routes/admin/courier/CourierRoutes');
const publicOrderRouter = require('./src/routes/orders/public-orders');
const publicCatalogRouter = require('./src/routes/public/catalog');
const { publicRateLimit } = require('./src/middleware/public-rate-limit');
const { bootstrapOnDevelopmentStart } = require('./src/bootstrap/admin');
const { registerLocalImageServing } = require('./src/media/image-storage');

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: CORS_ORIGIN.split(',').map((origin) => origin.trim()) }));

// Media uploads are Base64-encoded and need a separate body size allowance.
app.use('/api/admin/catalog/media', express.json({ limit: '8mb' }));
app.use('/api/admin/catalog', express.json({ limit: '256kb' }));
app.use(express.json({ limit: '32kb' }));

app.use('/api/admin/auth', adminAuthRouter);
app.use('/api/admin/catalog', adminCatalogRouter);
app.use('/api/admin/orders', adminOrderRouter);
app.use('/api/admin/couriers', courierRoutes);
app.use('/api/orders', publicOrderRouter);
app.use('/api', publicCatalogRouter);

registerLocalImageServing(app);

app.get('/api/health', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/newsletter', publicRateLimit({ max: 5 }), async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 190) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }

    await pool.query(
      'INSERT IGNORE INTO newsletter_subscribers (email) VALUES (?)',
      [email]
    );

    return res.status(201).json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request exceeds the size limit.' });
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid request body.' });
  }

  console.error('API error:', error.message);
  return res.status(500).json({ error: 'Something went wrong.' });
});

async function startServer() {
  try {
    if (shouldMigrateOnStart()) {
      await runMigrations();
    } else {
      await sequelize.authenticate();
      await sequelize.query('SELECT 1 FROM admin_roles LIMIT 0');
    }

    await bootstrapOnDevelopmentStart();
    app.listen(PORT, () => {
      console.log(`Aayash E-Mart API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(`Backend startup failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
