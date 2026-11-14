const verificarAutenticacion = (req, res, next) => {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ ok: false, mensaje: 'No ha iniciado sesión' });
  }
  next();
};

const verificarAdmin = (req, res, next) => {
  if (!req.session || !req.session.usuario || req.session.usuario.rol !== 'ADMIN') {
    return res.status(403).json({ ok: false, mensaje: 'Acceso denegado: Se requiere rol de Administrador' });
  }
  next();
};

const verificarCliente = (req, res, next) => {
  if (!req.session || !req.session.usuario || req.session.usuario.rol !== 'CLIENTE') {
    return res.status(403).json({ ok: false, mensaje: 'Acceso denegado: Exclusivo para clientes' });
  }
  next();
};

const verificarSesionCajero = (req, res, next) => {
  if (!req.session || !req.session.cajeroCuentaId) {
    return res.status(401).json({ ok: false, mensaje: 'Sesión de cajero no activa. Ingrese su cuenta y PIN.' });
  }
  next();
};

module.exports = { verificarAutenticacion, verificarAdmin, verificarCliente, verificarSesionCajero };