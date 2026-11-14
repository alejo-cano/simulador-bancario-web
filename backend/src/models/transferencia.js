const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transferencia = sequelize.define('Transferencia', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cuenta_origen_id: { type: DataTypes.INTEGER, allowNull: false },
  cuenta_destino_id: { type: DataTypes.INTEGER, allowNull: false },
  valor: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  descripcion: { type: DataTypes.STRING(255), allowNull: false },
  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'transferencias',
  timestamps: false
});

module.exports = Transferencia;