const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'simulador_bancario',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    timezone: '-05:00', // Hora de Colombia
    dialectOptions: process.env.DB_SSL === 'true' ? {
      ssl: { require: true, rejectUnauthorized: false }
    } : {}
  }
);

module.exports = sequelize;