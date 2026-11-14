const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verificarAdmin } = require('../middlewares/authMiddleware');

router.use(verificarAdmin);

router.get('/dashboard', adminController.obtenerDashboard);
router.get('/clientes', adminController.listarClientes);
router.post('/clientes', adminController.crearCliente);
router.put('/clientes/:id', adminController.editarCliente);
router.patch('/clientes/:id/estado', adminController.cambiarEstadoCliente);
router.post('/consignar', adminController.consignar);
router.get('/movimientos', adminController.listarMovimientosGenerales);

module.exports = router;