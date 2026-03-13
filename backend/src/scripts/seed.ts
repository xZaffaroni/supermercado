import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcrypt';
import pool from '../config/database';

async function seed() {
  try {
    console.log('🌱 Iniciando seed de datos...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    await pool.query(`
      INSERT IGNORE INTO usuarios (nombre, email, password, rol_id) VALUES
      ('Administrador', 'admin@supermercado.com', $1, 1)
    `, [adminPassword]);

    // Create cashier user
    const cajeroPassword = await bcrypt.hash('cajero123', 10);
    await pool.query(`
      INSERT IGNORE INTO usuarios (nombre, email, password, rol_id) VALUES
      ('Cajero Demo', 'cajero@supermercado.com', $1, 2)
    `, [cajeroPassword]);

    // Create employee user
    const empleadoPassword = await bcrypt.hash('empleado123', 10);
    await pool.query(`
      INSERT IGNORE INTO usuarios (nombre, email, password, rol_id) VALUES
      ('Empleado Demo', 'empleado@supermercado.com', $1, 3)
    `, [empleadoPassword]);

    // Create suppliers
    await pool.query(`
      INSERT IGNORE INTO proveedores (nombre, telefono, email, direccion, contacto) VALUES
      ('Distribuidora Central', '+54 11 4444-5555', 'ventas@distribuidora.com', 'Av. Principal 1234', 'Carlos Rodríguez'),
      ('Lácteos del Sur', '+54 11 3333-4444', 'pedidos@lacteosdelsur.com', 'Calle Industria 567', 'María López'),
      ('Bebidas Express', '+54 11 2222-3333', 'info@bebidasexpress.com', 'Ruta 5 Km 23', 'Juan García')
    `);

    // Create sample products
    await pool.query(`
      INSERT IGNORE INTO productos (nombre, codigo_barras, precio_compra, precio_venta, stock, stock_minimo, categoria_id, proveedor_id) VALUES
      ('Coca-Cola 500ml', '7790895000508', 350, 600, 48, 10, 1, 3),
      ('Pepsi 500ml', '7791813420309', 320, 550, 36, 10, 1, 3),
      ('Agua Mineral 500ml', '7798062548016', 180, 350, 60, 15, 1, 3),
      ('Leche Entera 1L', '7793345000018', 450, 750, 24, 10, 2, 2),
      ('Yogur Natural 200g', '7793345000100', 280, 480, 20, 8, 2, 2),
      ('Queso Cremoso 1kg', '7793345000200', 2500, 3800, 10, 3, 2, 2),
      ('Pan Lactal', '7790310000112', 600, 950, 25, 5, 5, 1),
      ('Galletitas Dulces', '7790580303006', 350, 620, 40, 10, 8, 1),
      ('Arroz 1kg', '7790150000012', 500, 850, 30, 8, 10, 1),
      ('Fideos 500g', '7790150000029', 300, 520, 45, 10, 10, 1),
      ('Aceite Girasol 1.5L', '7790150000036', 800, 1350, 20, 5, 10, 1),
      ('Detergente 750ml', '7790030000418', 400, 700, 15, 5, 6, 1),
      ('Jabón en Polvo 800g', '7790030000500', 650, 1100, 18, 5, 6, 1),
      ('Shampoo 400ml', '7790030000600', 700, 1200, 12, 4, 7, 1),
      ('Tomates Perita Lata 400g', '7790030000700', 280, 450, 35, 10, 9, 1),
      ('Atún en Lata 170g', '7790030000800', 450, 750, 25, 8, 9, 1),
      ('Cerveza Lata 473ml', '7790895001000', 500, 850, 48, 12, 1, 3),
      ('Jugo Natural 1L', '7790895002000', 380, 650, 20, 8, 1, 3),
      ('Manteca 200g', '7793345000300', 550, 900, 15, 5, 2, 2),
      ('Dulce de Leche 400g', '7793345000400', 600, 980, 18, 5, 2, 2)
    `);

    // Create sample clients
    await pool.query(`
      INSERT IGNORE INTO clientes (nombre, telefono, email) VALUES
      ('Consumidor Final', '', ''),
      ('Juan Pérez', '+54 11 5555-6666', 'juan@email.com'),
      ('María García', '+54 11 7777-8888', 'maria@email.com')
    `);

    console.log('✅ Seed completado exitosamente!');
    console.log('');
    console.log('📋 Usuarios creados:');
    console.log('   Admin:    admin@supermercado.com / admin123');
    console.log('   Cajero:   cajero@supermercado.com / cajero123');
    console.log('   Empleado: empleado@supermercado.com / empleado123');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en seed:', err);
    process.exit(1);
  }
}

seed();
