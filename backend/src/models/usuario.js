const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Usuario = sequelize.define('Usuario', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  documento: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  nombre_completo: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  telefono: { type: DataTypes.STRING(20), allowNull: false },
  direccion: { type: DataTypes.STRING(150), allowNull: false },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  rol: { type: DataTypes.ENUM('ADMIN', 'CLIENTE'), allowNull: false, defaultValue: 'CLIENTE' },
  estado: { type: DataTypes.ENUM('ACTIVO', 'INACTIVO', 'BLOQUEADO'), allowNull: false, defaultValue: 'ACTIVO' }
}, {
  tableName: 'usuarios',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Usuario;