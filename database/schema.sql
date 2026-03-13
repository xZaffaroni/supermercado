-- ============================================
-- SISTEMA POS SUPERMERCADO - Database Schema
-- MySQL / MariaDB (XAMPP)
-- ============================================

-- ============================================
-- ROLES
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO roles (nombre, descripcion) VALUES
('administrador', 'Acceso completo al sistema'),
('cajero', 'Acceso al POS y consultas básicas'),
('empleado', 'Acceso a inventario y consultas');

-- ============================================
-- USUARIOS
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol_id INT NOT NULL,
    activo TINYINT(1) DEFAULT 1,
    ultimo_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES roles(id)
);

-- ============================================
-- CATEGORIAS
-- ============================================
CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion VARCHAR(255),
    activo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO categorias (nombre, descripcion) VALUES
('Bebidas', 'Bebidas en general'),
('Lácteos', 'Productos lácteos'),
('Carnes', 'Carnes y embutidos'),
('Frutas y Verduras', 'Frutas y verduras frescas'),
('Panadería', 'Productos de panadería'),
('Limpieza', 'Productos de limpieza'),
('Higiene Personal', 'Productos de higiene personal'),
('Snacks', 'Snacks y golosinas'),
('Enlatados', 'Productos enlatados'),
('Granos y Cereales', 'Granos, cereales y harinas');

-- ============================================
-- PROVEEDORES
-- ============================================
CREATE TABLE IF NOT EXISTS proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(30),
    email VARCHAR(150),
    direccion VARCHAR(255),
    contacto VARCHAR(100),
    notas TEXT,
    activo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- PRODUCTOS
-- ============================================
CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    codigo_barras VARCHAR(50) UNIQUE,
    precio_compra DECIMAL(12,2) NOT NULL DEFAULT 0,
    precio_venta DECIMAL(12,2) NOT NULL DEFAULT 0,
    stock INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 5,
    categoria_id INT,
    proveedor_id INT,
    imagen_url VARCHAR(500),
    activo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
);

CREATE INDEX idx_productos_codigo ON productos(codigo_barras);
CREATE INDEX idx_productos_nombre ON productos(nombre);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);

-- ============================================
-- CLIENTES
-- ============================================
CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(30),
    email VARCHAR(150),
    direccion VARCHAR(255),
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- CAJAS (Cash Register Sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS cajas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    monto_inicial DECIMAL(12,2) NOT NULL DEFAULT 0,
    monto_final DECIMAL(12,2),
    total_ventas DECIMAL(12,2) DEFAULT 0,
    total_efectivo DECIMAL(12,2) DEFAULT 0,
    total_tarjeta DECIMAL(12,2) DEFAULT 0,
    total_transferencia DECIMAL(12,2) DEFAULT 0,
    total_retiros DECIMAL(12,2) DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'abierta',
    notas TEXT,
    abierta_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cerrada_at TIMESTAMP NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- ============================================
-- VENTAS
-- ============================================
CREATE TABLE IF NOT EXISTS ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_ticket VARCHAR(20) UNIQUE NOT NULL,
    usuario_id INT NOT NULL,
    cliente_id INT,
    caja_id INT,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    descuento DECIMAL(12,2) NOT NULL DEFAULT 0,
    impuesto DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    metodo_pago VARCHAR(30) NOT NULL DEFAULT 'efectivo',
    monto_recibido DECIMAL(12,2) DEFAULT 0,
    cambio DECIMAL(12,2) DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'completada',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (caja_id) REFERENCES cajas(id)
);

CREATE INDEX idx_ventas_fecha ON ventas(created_at);
CREATE INDEX idx_ventas_usuario ON ventas(usuario_id);
CREATE INDEX idx_ventas_caja ON ventas(caja_id);

-- ============================================
-- DETALLE VENTAS
-- ============================================
CREATE TABLE IF NOT EXISTS detalle_ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venta_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(12,2) NOT NULL,
    descuento DECIMAL(12,2) DEFAULT 0,
    subtotal DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

CREATE INDEX idx_detalle_ventas_venta ON detalle_ventas(venta_id);

-- ============================================
-- COMPRAS A PROVEEDORES
-- ============================================
CREATE TABLE IF NOT EXISTS compras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proveedor_id INT NOT NULL,
    usuario_id INT NOT NULL,
    numero_orden VARCHAR(20) UNIQUE NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    impuesto DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'pendiente',
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- ============================================
-- DETALLE COMPRAS
-- ============================================
CREATE TABLE IF NOT EXISTS detalle_compras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    compra_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- ============================================
-- INVENTARIO MOVIMIENTOS
-- ============================================
CREATE TABLE IF NOT EXISTS inventario_movimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    cantidad INT NOT NULL,
    stock_anterior INT NOT NULL,
    stock_nuevo INT NOT NULL,
    referencia VARCHAR(50),
    notas TEXT,
    usuario_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_inventario_producto ON inventario_movimientos(producto_id);
CREATE INDEX idx_inventario_tipo ON inventario_movimientos(tipo);

-- ============================================
-- RETIROS DE CAJA
-- ============================================
CREATE TABLE IF NOT EXISTS retiros_caja (
    id INT AUTO_INCREMENT PRIMARY KEY,
    caja_id INT NOT NULL,
    monto DECIMAL(12,2) NOT NULL,
    motivo VARCHAR(255),
    usuario_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (caja_id) REFERENCES cajas(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- ============================================
-- SEED DATA - Admin user (password: admin123)
-- ============================================
-- El seed se realiza utilizando el script del backend.
-- Se recomienda ejecutar npm run seed luego de iniciar el servidor.
