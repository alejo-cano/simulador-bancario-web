const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Movimiento = sequelize.define('Movimiento', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cuenta_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo_movimiento: {
    type: DataTypes.ENUM('CONSIGNACION', 'RETIRO_CAJERO', 'TRANSFERENCIA_ENVIADA', 'TRANSFERENCIA_RECIBIDA'),
    allowNull: false
  },
  valor: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  saldo_resultante: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  descripcion: { type: DataTypes.STRING(255), allowNull: false },
  transferencia_id: { type: DataTypes.INTEGER, allowNull: true },
  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'movimientos',
  timestamps: false
});

module.exports = Movimiento;