const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const { sequelize, asegurarDatosPrueba } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de sesiones
app.use(session({
  secret: process.env.SESSION_SECRET || 'clave_secreta_banco_2026',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 4 } // 4 horas
}));

// Servir los archivos HTML/CSS/JS de la carpeta frontend
app.use(express.static(path.join(__dirname, '../../frontend')));

// Rutas de la API (Las descomentaremos a medida que Cano y Felipe creen sus archivos)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/cliente', require('./routes/clienteRoutes'));
app.use('/api/cajero', require('./routes/cajeroRoutes'));

// Ruta de verificación de estado
app.get('/api/health', (req, res) => {
  res.json({ ok: true, mensaje: 'Servidor Bancario activo' });
});

// Inicializar base de datos y arrancar servidor
async function iniciarServidor() {
  try {
    await sequelize.authenticate();
    console.log('Conexión a MySQL establecida correctamente.');
    await sequelize.sync(); // Sincroniza tablas si no existen
    await asegurarDatosPrueba(); // Asegura usuarios y saldos de prueba
    app.listen(PORT, () => {
      console.log(`Simulador Bancario Web ejecutándose en: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error.message);
  }
}

iniciarServidor();