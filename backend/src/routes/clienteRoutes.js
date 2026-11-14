const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const { verificarCliente } = require('../middlewares/authMiddleware');

router.use(verificarCliente);

router.get('/resumen', clienteController.obtenerResumenCliente);
router.put('/perfil', clienteController.actualizarPerfil);
router.put('/password', clienteController.cambiarPassword);
router.post('/transferir', clienteController.realizarTransferencia);

module.exports = router;