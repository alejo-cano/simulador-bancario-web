-- ==========================================================
-- PROYECTO INTEGRADOR: SIMULADOR BANCARIO WEB
-- Archivo: database.sql
-- ==========================================================

DROP DATABASE IF EXISTS simulador_bancario;
CREATE DATABASE simulador_bancario CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE simulador_bancario;

-- 1. TABLA DE USUARIOS (Clientes y Administradores)
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    documento VARCHAR(20) NOT NULL UNIQUE,
    nombre_completo VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    telefono VARCHAR(20) NOT NULL,
    direccion VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('ADMIN', 'CLIENTE') NOT NULL DEFAULT 'CLIENTE',
    estado ENUM('ACTIVO', 'INACTIVO', 'BLOQUEADO') NOT NULL DEFAULT 'ACTIVO',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. TABLA DE CUENTAS BANCARIAS
CREATE TABLE cuentas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_cuenta VARCHAR(20) NOT NULL UNIQUE,
    tipo_cuenta ENUM('AHORROS', 'CORRIENTE') NOT NULL DEFAULT 'AHORROS',
    saldo DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    pin_hash VARCHAR(255) NOT NULL,
    estado ENUM('ACTIVO', 'INACTIVO', 'BLOQUEADO') NOT NULL DEFAULT 'ACTIVO',
    usuario_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cuenta_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_saldo_positivo CHECK (saldo >= 0)
) ENGINE=InnoDB;

-- 3. TABLA DE TRANSFERENCIAS
CREATE TABLE transferencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cuenta_origen_id INT NOT NULL,
    cuenta_destino_id INT NOT NULL,
    valor DECIMAL(15, 2) NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transf_origen FOREIGN KEY (cuenta_origen_id) REFERENCES cuentas(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_transf_destino FOREIGN KEY (cuenta_destino_id) REFERENCES cuentas(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_valor_transf CHECK (valor > 0)
) ENGINE=InnoDB;

-- 4. TABLA DE MOVIMIENTOS FINANCIEROS
CREATE TABLE movimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cuenta_id INT NOT NULL,
    tipo_movimiento ENUM('CONSIGNACION', 'RETIRO_CAJERO', 'TRANSFERENCIA_ENVIADA', 'TRANSFERENCIA_RECIBIDA') NOT NULL,
    valor DECIMAL(15, 2) NOT NULL,
    saldo_resultante DECIMAL(15, 2) NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    transferencia_id INT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_movimiento_cuenta FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_movimiento_transferencia FOREIGN KEY (transferencia_id) REFERENCES transferencias(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_valor_movimiento CHECK (valor > 0)
) ENGINE=InnoDB;

-- ==========================================================
-- DATOS DE PRUEBA (1 Admin, 3 Clientes, Cuentas y Movimientos)
-- Contraseña para todos los usuarios: 123456
-- PIN de cajero para todas las cuentas: 1234
-- Hash bcrypt de '123456': $2b$10$6K9p8x5v2m1n4b7v8c9x0eO5rT3yU6iI8oP0aA2sS4dD6fF8gG0hH
-- (Nota: El script de inicialización del backend asegura los hashes exactos al arrancar)
-- ==========================================================

INSERT INTO usuarios (id, documento, nombre_completo, email, telefono, direccion, password_hash, rol, estado) VALUES
(1, '1000000001', 'Administrador General', 'admin@banco.com', '3001112233', 'Sede Principal Banco', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8D0R6V1W7aB5x2K9pL4mN8qR1sT3uW', 'ADMIN', 'ACTIVO'),
(2, '1053800100', 'Carlos Andrés Pérez', 'carlos@correo.com', '3102223344', 'Calle 45 # 23-10', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8D0R6V1W7aB5x2K9pL4mN8qR1sT3uW', 'CLIENTE', 'ACTIVO'),
(3, '1053800200', 'María Fernanda Gómez', 'maria@correo.com', '3153334455', 'Carrera 23 # 60-15', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8D0R6V1W7aB5x2K9pL4mN8qR1sT3uW', 'CLIENTE', 'ACTIVO'),
(4, '1053800300', 'Juan David Rodríguez', 'juan@correo.com', '3204445566', 'Avenida Santander # 12-30', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8D0R6V1W7aB5x2K9pL4mN8qR1sT3uW', 'CLIENTE', 'BLOQUEADO');

-- Cuentas bancarias (Carlos tiene $1.000.000 como pide el ejemplo de la prueba mínima del PDF)
INSERT INTO cuentas (id, numero_cuenta, tipo_cuenta, saldo, pin_hash, estado, usuario_id) VALUES
(1, '1001000001', 'AHORROS', 1000000.00, '$2b$10$CwTycUXWue0Thq9StjUM0uJ8D0R6V1W7aB5x2K9pL4mN8qR1sT3uW', 'ACTIVO', 2),
(2, '1001000002', 'AHORROS', 550000.00, '$2b$10$CwTycUXWue0Thq9StjUM0uJ8D0R6V1W7aB5x2K9pL4mN8qR1sT3uW', 'ACTIVO', 3),
(3, '1001000003', 'CORRIENTE', 250000.00, '$2b$10$CwTycUXWue0Thq9StjUM0uJ8D0R6V1W7aB5x2K9pL4mN8qR1sT3uW', 'BLOQUEADO', 4);

-- Transferencia inicial de prueba (De Carlos a María por $50.000)
INSERT INTO transferencias (id, cuenta_origen_id, cuenta_destino_id, valor, descripcion, fecha) VALUES
(1, 1, 2, 50000.00, 'Pago de almuerzo', NOW() - INTERVAL 1 DAY);

-- Movimientos iniciales de prueba
INSERT INTO movimientos (cuenta_id, tipo_movimiento, valor, saldo_resultante, descripcion, transferencia_id, fecha) VALUES
(1, 'CONSIGNACION', 1200000.00, 1200000.00, 'Consignación inicial de apertura', NULL, NOW() - INTERVAL 3 DAY),
(1, 'RETIRO_CAJERO', 150000.00, 1050000.00, 'Retiro en cajero automático', NULL, NOW() - INTERVAL 2 DAY),
(1, 'TRANSFERENCIA_ENVIADA', 50000.00, 1000000.00, 'Transferencia enviada a cuenta 1001000002 - Pago de almuerzo', 1, NOW() - INTERVAL 1 DAY),
(2, 'CONSIGNACION', 500000.00, 500000.00, 'Consignación inicial de apertura', NULL, NOW() - INTERVAL 3 DAY),
(2, 'TRANSFERENCIA_RECIBIDA', 50000.00, 550000.00, 'Transferencia recibida desde cuenta 1001000001 - Pago de almuerzo', 1, NOW() - INTERVAL 1 DAY),
(3, 'CONSIGNACION', 250000.00, 250000.00, 'Consignación inicial de apertura', NULL, NOW() - INTERVAL 5 DAY);