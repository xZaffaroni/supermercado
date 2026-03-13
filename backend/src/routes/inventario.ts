import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// GET /api/inventario/movimientos
router.get('/movimientos', async (req: AuthRequest, res: Response) => {
  try {
    const { producto_id, tipo, page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    let query = `SELECT im.*, p.nombre as producto_nombre, p.codigo_barras, u.nombre as usuario_nombre
                 FROM inventario_movimientos im
                 JOIN productos p ON im.producto_id = p.id
                 LEFT JOIN usuarios u ON im.usuario_id = u.id WHERE 1=1`;
    const params: any[] = [];
    let pc = 0;

    if (producto_id) { pc++; query += ` AND im.producto_id = $${pc}`; params.push(producto_id); }
    if (tipo) { pc++; query += ` AND im.tipo = $${pc}`; params.push(tipo); }

    const countResult = await pool.query(query.replace(/SELECT im\.\*.*FROM/, 'SELECT COUNT(*) FROM'), params);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY im.created_at DESC LIMIT $${pc + 1} OFFSET $${pc + 2}`;
    params.push(parseInt(limit as string), offset);

    const result = await pool.query(query, params);
    res.json({ data: result.rows, total, page: parseInt(page as string) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
});

// POST /api/inventario/ajuste - Manual inventory adjustment
router.post('/ajuste', authorizeRoles('administrador', 'empleado'), async (req: AuthRequest, res: Response) => {
  try {
    const { producto_id, cantidad, tipo, notas } = req.body;
    if (!producto_id || cantidad === undefined || !tipo) {
      return res.status(400).json({ error: 'producto_id, cantidad y tipo son requeridos' });
    }

    const product = await pool.query('SELECT stock FROM productos WHERE id = $1', [producto_id]);
    if (product.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    const stockAnterior = product.rows[0].stock;
    let stockNuevo: number;

    if (tipo === 'entrada') {
      stockNuevo = stockAnterior + cantidad;
    } else if (tipo === 'salida') {
      stockNuevo = stockAnterior - cantidad;
      if (stockNuevo < 0) return res.status(400).json({ error: 'Stock no puede ser negativo' });
    } else if (tipo === 'ajuste') {
      stockNuevo = cantidad; // Direct set
    } else {
      return res.status(400).json({ error: 'Tipo debe ser: entrada, salida o ajuste' });
    }

    await pool.query('UPDATE productos SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [stockNuevo, producto_id]);

    await pool.query(
      `INSERT INTO inventario_movimientos (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia, notas, usuario_id)
       VALUES ($1, $2, $3, $4, $5, 'ajuste_manual', $6, $7)`,
      [producto_id, tipo, Math.abs(tipo === 'ajuste' ? stockNuevo - stockAnterior : cantidad), stockAnterior, stockNuevo, notas, req.user?.id]
    );

    res.json({ message: 'Inventario actualizado', stock_anterior: stockAnterior, stock_nuevo: stockNuevo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al ajustar inventario' });
  }
});

// GET /api/inventario/stock - Current stock of all products
router.get('/stock', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.nombre, p.codigo_barras, p.stock, p.stock_minimo, p.precio_compra, p.precio_venta,
       c.nombre as categoria_nombre,
       CASE WHEN p.stock <= p.stock_minimo THEN true ELSE false END as stock_bajo
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       WHERE p.activo = true
       ORDER BY p.stock ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener stock' });
  }
});

export default router;
