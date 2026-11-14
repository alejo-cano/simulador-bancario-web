const bcrypt = require('bcryptjs');
const { sequelize, Usuario, Cuenta, Movimiento, Transferencia } = require('../models');

exports.obtenerResumenCliente = async (req, res) => {
  try {
    const usuarioId = req.session.usuario.id;
    const usuario = await Usuario.findByPk(usuarioId, {
      attributes: { exclude: ['password_hash'] },
      include: [{ model: Cuenta, as: 'cuentas', attributes: { exclude: ['pin_hash'] } }]
    });

    if (!usuario || usuario.cuentas.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'No se encontró cuenta asociada al cliente' });
    }

    const cuenta = usuario.cuentas[0];
    const movimientos = await Movimiento.findAll({
      where: { cuenta_id: cuenta.id },
      order: [['fecha', 'DESC'], ['id', 'DESC']]
    });

    res.json({
      ok: true,
      perfil: {
        id: usuario.id,
        documento: usuario.documento,
        nombre_completo: usuario.nombre_completo,
        email: usuario.email,
        telefono: usuario.telefono,
        direccion: usuario.direccion,
        estado: usuario.estado
      },
      cuenta: {
        id: cuenta.id,
        numero_cuenta: cuenta.numero_cuenta,
        tipo_cuenta: cuenta.tipo_cuenta,
        saldo: Number(cuenta.saldo),
        estado: cuenta.estado
      },
      movimientos
    });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: 'Error al obtener datos de la cuenta', error: err.message });
  }
};

exports.actualizarPerfil = async (req, res) => {
  try {
    const usuarioId = req.session.usuario.id;
    const { telefono, direccion, email } = req.body;

    if (!telefono || !direccion || !email) {
      return res.status(400).json({ ok: false, mensaje: 'Teléfono, dirección y correo son obligatorios' });
    }

    const usuario = await Usuario.findByPk(usuarioId);
    if (usuario.estado !== 'ACTIVO') {
      return res.status(403).json({ ok: false, mensaje: 'Su cuenta está bloqueada o inactiva' });
    }

    await usuario.update({ telefono, direccion, email });
    res.json({ ok: true, mensaje: 'Datos de perfil actualizados correctamente' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: 'Error al actualizar el perfil', error: err.message });
  }
};

exports.cambiarPassword = async (req, res) => {
  try {
    const usuarioId = req.session.usuario.id;
    const { password_actual, password_nueva } = req.body;

    if (!password_actual || !password_nueva || password_nueva.length < 6) {
      return res.status(400).json({ ok: false, mensaje: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const usuario = await Usuario.findByPk(usuarioId);
    const coincide = await bcrypt.compare(password_actual, usuario.password_hash);
    if (!coincide) {
      return res.status(400).json({ ok: false, mensaje: 'La contraseña actual no es correcta' });
    }

    usuario.password_hash = await bcrypt.hash(password_nueva, 10);
    await usuario.save();

    res.json({ ok: true, mensaje: 'Contraseña actualizada exitosamente' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: 'Error al cambiar la contraseña', error: err.message });
  }
};

exports.realizarTransferencia = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const usuarioId = req.session.usuario.id;
    const { cuenta_destino, valor, descripcion } = req.body;
    const monto = Number(valor);

    if (!cuenta_destino || !monto || monto <= 0) {
      await t.rollback();
      return res.status(400).json({ ok: false, mensaje: 'Ingrese una cuenta destino y un valor mayor a cero' });
    }

    const cuentaOrigen = await Cuenta.findOne({
      where: { usuario_id: usuarioId },
      include: [{ model: Usuario, as: 'titular' }],
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!cuentaOrigen) {
      await t.rollback();
      return res.status(404).json({ ok: false, mensaje: 'Cuenta origen no encontrada' });
    }

    if (cuentaOrigen.estado !== 'ACTIVO' || cuentaOrigen.titular.estado !== 'ACTIVO') {
      await t.rollback();
      return res.status(403).json({ ok: false, mensaje: 'Su cuenta está bloqueada y no puede realizar operaciones' });
    }

    if (cuentaOrigen.numero_cuenta === cuenta_destino) {
      await t.rollback();
      return res.status(400).json({ ok: false, mensaje: 'No puede transferir dinero a su misma cuenta' });
    }

    const cuentaDestino = await Cuenta.findOne({
      where: { numero_cuenta: cuenta_destino },
      include: [{ model: Usuario, as: 'titular' }],
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!cuentaDestino) {
      await t.rollback();
      return res.status(404).json({ ok: false, mensaje: 'La cuenta destino no existe en el banco' });
    }

    if (cuentaDestino.estado !== 'ACTIVO' || cuentaDestino.titular.estado !== 'ACTIVO') {
      await t.rollback();
      return res.status(400).json({ ok: false, mensaje: 'La cuenta destino se encuentra bloqueada o inactiva' });
    }

    const saldoOrigen = Number(cuentaOrigen.saldo);
    if (monto > saldoOrigen) {
      await t.rollback();
      return res.status(400).json({ ok: false, mensaje: 'Saldo insuficiente para realizar la transferencia' });
    }

    const nuevoSaldoOrigen = saldoOrigen - monto;
    const nuevoSaldoDestino = Number(cuentaDestino.saldo) + monto;

    cuentaOrigen.saldo = nuevoSaldoOrigen;
    cuentaDestino.saldo = nuevoSaldoDestino;

    await cuentaOrigen.save({ transaction: t });
    await cuentaDestino.save({ transaction: t });

    const detalle = descripcion || 'Transferencia entre cuentas';

    const transferencia = await Transferencia.create({
      cuenta_origen_id: cuentaOrigen.id,
      cuenta_destino_id: cuentaDestino.id,
      valor: monto,
      descripcion: detalle
    }, { transaction: t });

    // Movimiento para la cuenta origen (Descuento)
    await Movimiento.create({
      cuenta_id: cuentaOrigen.id,
      tipo_movimiento: 'TRANSFERENCIA_ENVIADA',
      valor: monto,
      saldo_resultante: nuevoSaldoOrigen,
      descripcion: `Transferencia enviada a cuenta ${cuentaDestino.numero_cuenta} - ${detalle}`,
      transferencia_id: transferencia.id
    }, { transaction: t });

    // Movimiento para la cuenta destino (Incremento)
    await Movimiento.create({
      cuenta_id: cuentaDestino.id,
      tipo_movimiento: 'TRANSFERENCIA_RECIBIDA',
      valor: monto,
      saldo_resultante: nuevoSaldoDestino,
      descripcion: `Transferencia recibida desde cuenta ${cuentaOrigen.numero_cuenta} - ${detalle}`,
      transferencia_id: transferencia.id
    }, { transaction: t });

    await t.commit();
    res.json({
      ok: true,
      mensaje: 'Transferencia realizada con éxito',
      nuevo_saldo: nuevoSaldoOrigen
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ ok: false, mensaje: 'Error al procesar la transferencia', error: err.message });
  }
};