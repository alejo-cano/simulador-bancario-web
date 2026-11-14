const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { sequelize, Cuenta, Usuario, Movimiento } = require('../models');

exports.ingresarCajero = async (req, res) => {
  try {
    const schema = Joi.object({
      numero_cuenta: Joi.string().required(),
      pin: Joi.string().min(4).max(6).required()
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ ok: false, mensaje: 'Ingrese número de cuenta y PIN válidos' });

    const cuenta = await Cuenta.findOne({
      where: { numero_cuenta: value.numero_cuenta },
      include: [{ model: Usuario, as: 'titular', attributes: ['nombre_completo', 'estado'] }]
    });

    if (!cuenta) return res.status(404).json({ ok: false, mensaje: 'La cuenta no existe' });
    if (cuenta.estado !== 'ACTIVO' || cuenta.titular.estado !== 'ACTIVO') {
      return res.status(403).json({ ok: false, mensaje: 'Operación rechazada: La cuenta o el titular están bloqueados/inactivos' });
    }

    const pinValido = await bcrypt.compare(value.pin, cuenta.pin_hash);
    if (!pinValido) return res.status(401).json({ ok: false, mensaje: 'PIN incorrecto' });

    req.session.cajeroCuentaId = cuenta.id;
    res.json({
      ok: true,
      mensaje: 'Acceso concedido al cajero',
      cuenta: {
        numero_cuenta: cuenta.numero_cuenta,
        tipo_cuenta: cuenta.tipo_cuenta,
        titular: cuenta.titular.nombre_completo,
        saldo: Number(cuenta.saldo)
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: 'Error en el cajero', error: err.message });
  }
};

exports.consultarDatosCajero = async (req, res) => {
  try {
    const cuenta = await Cuenta.findByPk(req.session.cajeroCuentaId, {
      include: [{ model: Usuario, as: 'titular', attributes: ['nombre_completo', 'estado'] }]
    });
    if (!cuenta || cuenta.estado !== 'ACTIVO') {
      return res.status(403).json({ ok: false, mensaje: 'La cuenta no está disponible para operar' });
    }

    const movimientos = await Movimiento.findAll({
      where: { cuenta_id: cuenta.id },
      order: [['fecha', 'DESC'], ['id', 'DESC']],
      limit: 10
    });

    res.json({
      ok: true,
      cuenta: {
        numero_cuenta: cuenta.numero_cuenta,
        tipo_cuenta: cuenta.tipo_cuenta,
        titular: cuenta.titular.nombre_completo,
        saldo: Number(cuenta.saldo)
      },
      movimientos
    });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: 'Error al consultar saldo', error: err.message });
  }
};

exports.retirar = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const valor = Number(req.body.valor);
    if (!valor || valor <= 0) {
      await t.rollback();
      return res.status(400).json({ ok: false, mensaje: 'El valor a retirar debe ser mayor que cero' });
    }

    const cuenta = await Cuenta.findByPk(req.session.cajeroCuentaId, {
      include: [{ model: Usuario, as: 'titular' }],
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!cuenta) {
      await t.rollback();
      return res.status(404).json({ ok: false, mensaje: 'La cuenta no existe' });
    }
    if (cuenta.estado !== 'ACTIVO' || cuenta.titular.estado !== 'ACTIVO') {
      await t.rollback();
      return res.status(403).json({ ok: false, mensaje: 'Cuenta bloqueada o inactiva. No puede realizar retiros.' });
    }

    const saldoActual = Number(cuenta.saldo);
    if (valor > saldoActual) {
      await t.rollback();
      return res.status(400).json({ ok: false, mensaje: 'Saldo insuficiente para realizar el retiro' });
    }

    const nuevoSaldo = saldoActual - valor;
    cuenta.saldo = nuevoSaldo;
    await cuenta.save({ transaction: t });

    await Movimiento.create({
      cuenta_id: cuenta.id,
      tipo_movimiento: 'RETIRO_CAJERO',
      valor: valor,
      saldo_resultante: nuevoSaldo,
      descripcion: 'Retiro cajero automático'
    }, { transaction: t });

    await t.commit();
    res.json({
      ok: true,
      mensaje: 'Retiro realizado con éxito',
      nuevo_saldo: nuevoSaldo
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ ok: false, mensaje: 'Error al procesar el retiro', error: err.message });
  }
};

exports.cerrarCajero = (req, res) => {
  if (req.session) delete req.session.cajeroCuentaId;
  res.json({ ok: true, mensaje: 'Operación de cajero finalizada' });
};  