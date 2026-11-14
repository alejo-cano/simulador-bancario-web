const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');
const Usuario = require('./usuario');
const Cuenta = require('./cuenta');
const Transferencia = require('./transferencia');
const Movimiento = require('./movimiento');

// Relaciones Usuario <-> Cuenta
Usuario.hasMany(Cuenta, { foreignKey: 'usuario_id', as: 'cuentas' });
Cuenta.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'titular' });

// Relaciones Cuenta <-> Movimiento
Cuenta.hasMany(Movimiento, { foreignKey: 'cuenta_id', as: 'movimientos' });
Movimiento.belongsTo(Cuenta, { foreignKey: 'cuenta_id', as: 'cuenta' });

// Relaciones Cuenta <-> Transferencia
Cuenta.hasMany(Transferencia, { foreignKey: 'cuenta_origen_id', as: 'transferenciasEnviadas' });
Cuenta.hasMany(Transferencia, { foreignKey: 'cuenta_destino_id', as: 'transferenciasRecibidas' });
Transferencia.belongsTo(Cuenta, { foreignKey: 'cuenta_origen_id', as: 'cuentaOrigen' });
Transferencia.belongsTo(Cuenta, { foreignKey: 'cuenta_destino_id', as: 'cuentaDestino' });

// Relación Transferencia <-> Movimiento
Transferencia.hasMany(Movimiento, { foreignKey: 'transferencia_id', as: 'movimientosAsociados' });
Movimiento.belongsTo(Transferencia, { foreignKey: 'transferencia_id', as: 'transferencia' });

// Función que garantiza los datos de prueba y hashes reales de bcrypt
async function asegurarDatosPrueba() {
  const totalUsuarios = await Usuario.count();
  const passHash = await bcrypt.hash('123456', 10);
  const pinHash = await bcrypt.hash('1234', 10);

  if (totalUsuarios === 0) {
    console.log('Insertando datos iniciales de prueba...');
    await Usuario.create({
      documento: '1000000001', nombre_completo: 'Administrador General',
      email: 'admin@banco.com', telefono: '3001112233', direccion: 'Sede Principal Banco',
      password_hash: passHash, rol: 'ADMIN', estado: 'ACTIVO'
    });
    const c1 = await Usuario.create({
      documento: '1053800100', nombre_completo: 'Carlos Andrés Pérez',
      email: 'carlos@correo.com', telefono: '3102223344', direccion: 'Calle 45 # 23-10',
      password_hash: passHash, rol: 'CLIENTE', estado: 'ACTIVO'
    });
    const c2 = await Usuario.create({
      documento: '1053800200', nombre_completo: 'María Fernanda Gómez',
      email: 'maria@correo.com', telefono: '3153334455', direccion: 'Carrera 23 # 60-15',
      password_hash: passHash, rol: 'CLIENTE', estado: 'ACTIVO'
    });
    const c3 = await Usuario.create({
      documento: '1053800300', nombre_completo: 'Juan David Rodríguez',
      email: 'juan@correo.com', telefono: '3204445566', direccion: 'Avenida Santander # 12-30',
      password_hash: passHash, rol: 'CLIENTE', estado: 'BLOQUEADO'
    });

    const cta1 = await Cuenta.create({
      numero_cuenta: '1001000001', tipo_cuenta: 'AHORROS', saldo: 1000000.00,
      pin_hash: pinHash, estado: 'ACTIVO', usuario_id: c1.id
    });
    const cta2 = await Cuenta.create({
      numero_cuenta: '1001000002', tipo_cuenta: 'AHORROS', saldo: 550000.00,
      pin_hash: pinHash, estado: 'ACTIVO', usuario_id: c2.id
    });
    const cta3 = await Cuenta.create({
      numero_cuenta: '1001000003', tipo_cuenta: 'CORRIENTE', saldo: 250000.00,
      pin_hash: pinHash, estado: 'BLOQUEADO', usuario_id: c3.id
    });

    await Movimiento.bulkCreate([
      { cuenta_id: cta1.id, tipo_movimiento: 'CONSIGNACION', valor: 1000000.00, saldo_resultante: 1000000.00, descripcion: 'Consignación inicial de apertura' },
      { cuenta_id: cta2.id, tipo_movimiento: 'CONSIGNACION', valor: 550000.00, saldo_resultante: 550000.00, descripcion: 'Consignación inicial de apertura' },
      { cuenta_id: cta3.id, tipo_movimiento: 'CONSIGNACION', valor: 250000.00, saldo_resultante: 250000.00, descripcion: 'Consignación inicial de apertura' }
    ]);
  } else {
    const admin = await Usuario.findOne({ where: { email: 'admin@banco.com' } });
    if (admin && admin.password_hash.startsWith('$2b$10$CwTycUXW')) {
      await Usuario.update({ password_hash: passHash }, { where: {} });
      await Cuenta.update({ pin_hash: pinHash }, { where: {} });
    }
  }
}

module.exports = { sequelize, Usuario, Cuenta, Transferencia, Movimiento, asegurarDatosPrueba };