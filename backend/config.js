const path = require('path');
module.exports = {
  PORT: process.env.PORT || 4000,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  DB_PATH: path.join(__dirname, 'data', 'aayash.db'),
  FREE_DELIVERY_OVER: 1000, // ৳
  DELIVERY_FEE: 60,         // ৳
};
