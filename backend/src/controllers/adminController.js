const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { sequelize, Usuario, Cuenta, Movimiento } = require('../models');

exports.obtenerDashboard = async (req, res) => {
  try {
    const totalClientes = await Usuario.count({ where: { rol: 'CLIENTE' } });
    const clientesActivos = await Usuario.count({ where: { rol: 'CLIENTE', estado: 'ACTIVO' } });
    const clientesBloqueados = await Usuario.count({ where: { rol: 'CLIENTE', estado: 'BLOQUEADO' } });
    const sumaSaldos = await Cuenta.sum('saldo') || 0;

    res.json({
      ok: true,
      dashboard: {
        totalClientes,
        clientesActivos,
        clientesBloqueados,
        sumaSaldos: Number(sumaSaldos)
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: 'Error al cargar el dashboard', error: err.message });
  }
};

exports.listarClientes = async (req, res) => {
  try {
    const { buscar } = req.query;
    const condicion = { rol: 'CLIENTE' };

    if (buscar) {
      condicion[Op.or] = [
        { nombre_completo: { [Op.like]: `%${buscar}%` } },
        { documento: { [Op.like]: `%${buscar}%` } },
        { email: { [Op.like]: `%${buscar}%` } }
      ];
    }

    const clientes = await Usuario.findAll({
      where: condicion,
      attributes: { exclude: ['password_hash'] },
      include: [{ model: Cuenta, as: 'cuentas', attributes: { exclude: ['pin_hash'] } }],
      order: [['id', 'DESC']]
    });

    res.json({ ok: true, clientes });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: 'Error al listar clientes', error: err.message });
  }
};

exports.crearCliente = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { documento, nombre_completo, email, telefono, direccion, password, tipo_cuenta, saldo_inicial, pin } = req.body;

    if (!documento || !nombre_completo || !email || !password || !pin) {
      await t.rollback();
      return res.status(400).json({ ok: false, mensaje: 'Todos los campos obligatorios deben ser diligenciados' });
    }

    const saldoApertura = Number(saldo_inicial || 0);
    if (saldoApertura < 0) {
      await t.rollback();
      return res.status(400).json({ ok: false, mensaje: 'El saldo inicial no puede ser negativo' });
    }

    const existe = await Usuario.findOne({ where: { [Op.or]: [{ documento }, { email }] } });
    if (existe) {
      await t.rollback();
      return res.status(400).json({ ok: false, mensaje: 'El documento o correo electrónico ya está registrado' });
    }

    const password_hash = await bcrypt.hash(String(password), 10);
    const pin_hash = await bcrypt.hash(String(pin), 10);

    const nuevoUsuario = await Usuario.create({
      documento, nombre_completo, email, telefono, direccion,
      password_hash, rol: 'CLIENTE', estado: 'ACTIVO'
    }, { transaction: t });

    const numero_cuenta = '1001' + String(Date.now()).slice(-6);

    const nuevaCuenta = await Cuenta.create({
      numero_cuenta,
      tipo_cuenta: tipo_cuenta || 'AHORROS',
      saldo: saldoApertura,
      pin_hash,
      estado: 'ACTIVO',
      usuario_id: nuevoUsuario.id
    }, { transaction: t });

    if (saldoApertura > 0) {
      await Movimiento.create({
        cuenta_id: nuevaCuenta.id,
        tipo_movimiento: 'CONSIGNACION',
        valor: saldoApertura,
        saldo_resultante: saldoApertura,
        descripcion: 'Consignación inicial de apertura de cuenta'
      }, { transaction: t });
    }

    await t.commit();
    res.status(201).json({ ok: true, mensaje: `Cliente creado con cuenta N° ${numero_cuenta}` });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ ok: false, mensaje: 'Error al crear cliente', error: err.message });
  }
};

exports.editarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_completo, email, telefono, direccion } = req.body;

    const cliente = await Usuario.findOne({ where: { id, rol: 'CLIENTE' } });
    if (!cliente) return res.status(404).json({ ok: false, mensaje: 'Cliente no encontrado' });

    await cliente.update({ nombre_completo, email, telefono, direccion });
    res.json({ ok: true, mensaje: 'Información del cliente actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: 'Error al actualizar cliente', error: err.message });
  }
};

exports.cambiarEstadoCliente = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['ACTIVO', 'INACTIVO', 'BLOQUEADO'].includes(estado)) {
      await t.rollback();
      return res.status(400).json({ ok: false, mensaje: 'Estado no válido' });
    }

    const cliente = await Usuario.findOne({ where: { id, rol: 'CLIENTE' }, transaction: t });
    if (!cliente) {
      await t.rollback();
      return res.status(404).json({ ok: false, mensaje: 'Cliente no encontrado' });
    }

    await cliente.update({ estado }, { transaction: t });
    await Cuenta.update({ estado }, { where: { usuario_id: cliente.id }, transaction: t });

    await t.commit();
    res.json({ ok: true, mensaje: `Estado del cliente y su cuenta actualizado a ${estado}` });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ ok: false, mensaje: 'Error al cambiar estado', error: err.message });
  }
};

exports.consignar = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { numero_cuenta, valor, descripcion } = req.body;
    const monto = Number(valor);

    if (!numero_cuenta || !monto || monto <= 0) {
      await t.rollback();
      return res.status(400).json({ ok: false, mensaje: 'Ingrese una cuenta válida y un valor mayor a cero' });
    }

    const cuenta = await Cuenta.findOne({
      where: { numero_cuenta },
      include: [{ model: Usuario, as: 'titular' }],
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!cuenta) {
      await t.rollback();
      return res.status(404).json({ ok: false, mensaje: 'La cuenta bancaria no existe' });
    }
    if (cuenta.estado !== 'ACTIVO' || cuenta.titular.estado !== 'ACTIVO') {
      await t.rollback();
      return res.status(403).json({ ok: false, mensaje: 'No se puede consignar a una cuenta bloqueada o inactiva' });
    }

    const nuevoSaldo = Number(cuenta.saldo) + monto;
    cuenta.saldo = nuevoSaldo;
    await cuenta.save({ transaction: t });

    await Movimiento.create({
      cuenta_id: cuenta.id,
      tipo_movimiento: 'CONSIGNACION',
      valor: monto,
      saldo_resultante: nuevoSaldo,
      descripcion: descripcion || 'Consignación bancaria por ventanilla administrativa'
    }, { transaction: t });

    await t.commit();
    res.json({ ok: true, mensaje: 'Consignación realizada exitosamente', nuevo_saldo: nuevoSaldo });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ ok: false, mensaje: 'Error al procesar la consignación', error: err.message });
  }
};

exports.listarMovimientosGenerales = async (req, res) => {
  try {
    const movimientos = await Movimiento.findAll({
      include: [{
        model: Cuenta,
        as: 'cuenta',
        attributes: ['numero_cuenta', 'tipo_cuenta'],
        include: [{ model: Usuario, as: 'titular', attributes: ['nombre_completo', 'documento'] }]
      }],
      order: [['fecha', 'DESC'], ['id', 'DESC']],
      limit: 100
    });
    res.json({ ok: true, movimientos });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: 'Error al consultar movimientos', error: err.message });
  }
};