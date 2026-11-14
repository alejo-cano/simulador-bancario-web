const express = require('express');
const router = express.Router();
const cajeroController = require('../controllers/cajeroController');
const { verificarSesionCajero } = require('../middlewares/authMiddleware');

router.post('/login', cajeroController.ingresarCajero);
router.get('/datos', verificarSesionCajero, cajeroController.consultarDatosCajero);
router.post('/retirar', verificarSesionCajero, cajeroController.retirar);
router.post('/logout', cajeroController.cerrarCajero);

module.exports = router;