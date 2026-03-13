import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);
router.use(authorizeRoles('administrador'));

// GET /api/reportes/ventas-hoy
router.get('/ventas-hoy', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as total_ventas, COALESCE(SUM(total), 0) as total_monto,
      COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) as efectivo,
      COALESCE(SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END), 0) as tarjeta,
      COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END), 0) as transferencia
      FROM ventas WHERE DATE(created_at) = CURRENT_DATE AND estado = 'completada'
    `);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ventas del día' });
  }
});

// GET /api/reportes/ventas-mes
router.get('/ventas-mes', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT DATE(created_at) as fecha, COUNT(*) as total_ventas, SUM(total) as total_monto
      FROM ventas WHERE created_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01') AND estado = 'completada'
      GROUP BY DATE(created_at) ORDER BY fecha ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ventas del mes' });
  }
});

// GET /api/reportes/productos-mas-vendidos
router.get('/productos-mas-vendidos', async (req: AuthRequest, res: Response) => {
  try {
    const { periodo = '30' } = req.query;
    const result = await pool.query(`
      SELECT p.id, p.nombre, p.codigo_barras, SUM(dv.cantidad) as total_vendido,
      SUM(dv.subtotal) as total_ingresos
      FROM detalle_ventas dv
      JOIN productos p ON dv.producto_id = p.id
      JOIN ventas v ON dv.venta_id = v.id
      WHERE v.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL ? DAY)
      AND v.estado = 'completada'
      GROUP BY p.id, p.nombre, p.codigo_barras
      ORDER BY total_vendido DESC LIMIT 20
    `, [parseInt(periodo as string)]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener productos más vendidos' });
  }
});

// GET /api/reportes/ganancias
router.get('/ganancias', async (req: AuthRequest, res: Response) => {
  try {
    const { periodo = '30' } = req.query;
    const result = await pool.query(`
      SELECT DATE(v.created_at) as fecha,
      SUM(dv.subtotal) as ingresos,
      SUM(dv.cantidad * p.precio_compra) as costo,
      SUM(dv.subtotal) - SUM(dv.cantidad * p.precio_compra) as ganancia
      FROM ventas v
      JOIN detalle_ventas dv ON v.id = dv.venta_id
      JOIN productos p ON dv.producto_id = p.id
      WHERE v.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL ? DAY)
      AND v.estado = 'completada'
      GROUP BY DATE(v.created_at)
      ORDER BY fecha ASC
    `, [parseInt(periodo as string)]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ganancias' });
  }
});

// GET /api/reportes/stock-bajo
router.get('/stock-bajo', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.nombre as categoria_nombre
      FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.stock <= p.stock_minimo AND p.activo = true
      ORDER BY p.stock ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener productos con stock bajo' });
  }
});

// GET /api/reportes/dashboard
router.get('/dashboard', async (_req: AuthRequest, res: Response) => {
  try {
    const ventasHoy = await pool.query(`
      SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as monto
      FROM ventas WHERE DATE(created_at) = CURRENT_DATE AND estado = 'completada'
    `);

    const ventasMes = await pool.query(`
      SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as monto
      FROM ventas WHERE created_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01') AND estado = 'completada'
    `);

    const stockBajo = await pool.query(`
      SELECT COUNT(*) as total FROM productos WHERE stock <= stock_minimo AND activo = true
    `);

    const totalProductos = await pool.query('SELECT COUNT(*) as total FROM productos WHERE activo = true');
    const totalClientes = await pool.query('SELECT COUNT(*) as total FROM clientes');

    const ultimasVentas = await pool.query(`
      SELECT v.id, v.numero_ticket, v.total, v.metodo_pago, v.created_at, u.nombre as cajero
      FROM ventas v JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.estado = 'completada'
      ORDER BY v.created_at DESC LIMIT 10
    `);

    const ventasPorHora = await pool.query(`
      SELECT HOUR(created_at) as hora, COUNT(*) as total, SUM(total) as monto
      FROM ventas WHERE DATE(created_at) = CURRENT_DATE AND estado = 'completada'
      GROUP BY hora ORDER BY hora ASC
    `);

    res.json({
      ventas_hoy: ventasHoy.rows[0],
      ventas_mes: ventasMes.rows[0],
      stock_bajo: parseInt(stockBajo.rows[0].total),
      total_productos: parseInt(totalProductos.rows[0].total),
      total_clientes: parseInt(totalClientes.rows[0].total),
      ultimas_ventas: ultimasVentas.rows,
      ventas_por_hora: ventasPorHora.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener datos del dashboard' });
  }
});

// GET /api/reportes/ventas-rango
router.get('/ventas-rango', async (req: AuthRequest, res: Response) => {
  try {
    const { desde, hasta } = req.query;
    if (!desde || !hasta) return res.status(400).json({ error: 'Fechas desde y hasta son requeridas' });

    const result = await pool.query(`
      SELECT v.*, u.nombre as cajero_nombre
      FROM ventas v JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.created_at BETWEEN $1 AND $2 AND v.estado = 'completada'
      ORDER BY v.created_at DESC
    `, [desde, hasta]);

    const totals = await pool.query(`
      SELECT COUNT(*) as total_ventas, COALESCE(SUM(total), 0) as total_monto,
      COALESCE(SUM(descuento), 0) as total_descuentos
      FROM ventas WHERE created_at BETWEEN $1 AND $2 AND estado = 'completada'
    `, [desde, hasta]);

    res.json({ ventas: result.rows, resumen: totals.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ventas por rango' });
  }
});

export default router;
