const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cuenta = sequelize.define('Cuenta', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  numero_cuenta: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  tipo_cuenta: { type: DataTypes.ENUM('AHORROS', 'CORRIENTE'), allowNull: false, defaultValue: 'AHORROS' },
  saldo: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.00 },
  pin_hash: { type: DataTypes.STRING(255), allowNull: false },
  estado: { type: DataTypes.ENUM('ACTIVO', 'INACTIVO', 'BLOQUEADO'), allowNull: false, defaultValue: 'ACTIVO' },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'cuentas',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Cuenta;