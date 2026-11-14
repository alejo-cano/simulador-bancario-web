const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { Usuario } = require('../models');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(4).required()
});

exports.login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ ok: false, mensaje: 'Datos de acceso inválidos' });

    const usuario = await Usuario.findOne({ where: { email: value.email } });
    if (!usuario) return res.status(401).json({ ok: false, mensaje: 'Credenciales incorrectas' });

    if (usuario.estado !== 'ACTIVO') {
      return res.status(403).json({ ok: false, mensaje: `Su usuario se encuentra ${usuario.estado}. Contacte al banco.` });
    }

    const passwordValido = await bcrypt.compare(value.password, usuario.password_hash);
    if (!passwordValido) return res.status(401).json({ ok: false, mensaje: 'Credenciales incorrectas' });

    req.session.usuario = {
      id: usuario.id,
      documento: usuario.documento,
      nombre_completo: usuario.nombre_completo,
      email: usuario.email,
      rol: usuario.rol
    };

    res.json({ ok: true, mensaje: 'Bienvenido', usuario: req.session.usuario });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: 'Error en el servidor', error: err.message });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true, mensaje: 'Sesión cerrada correctamente' });
  });
};

exports.sesionActual = (req, res) => {
  if (req.session && req.session.usuario) {
    return res.json({ ok: true, usuario: req.session.usuario });
  }
  res.status(401).json({ ok: false, mensaje: 'Sin sesión activa' });
};