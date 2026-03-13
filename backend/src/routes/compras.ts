import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// POST /api/compras - Create purchase order
router.post('/', authorizeRoles('administrador', 'empleado'), async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { proveedor_id, items, notas } = req.body;

    if (!proveedor_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Proveedor e items son requeridos' });
    }

    // Generate order number
    const orderResult = await client.query("SELECT COALESCE(MAX(CAST(SUBSTRING(numero_orden FROM 3) AS INTEGER)), 0) + 1 as next FROM compras");
    const orderNum = `OC${String(orderResult.rows[0].next).padStart(8, '0')}`;

    let subtotal = 0;
    for (const item of items) {
      item.subtotal = item.precio_unitario * item.cantidad;
      subtotal += item.subtotal;
    }

    const compraResult = await client.query(
      `INSERT INTO compras (proveedor_id, usuario_id, numero_orden, subtotal, total, notas)
       VALUES ($1, $2, $3, $4, $4, $5) RETURNING *`,
      [proveedor_id, req.user?.id, orderNum, subtotal, notas]
    );
    const compraId = compraResult.rows[0].id;

    for (const item of items) {
      await client.query(
        `INSERT INTO detalle_compras (compra_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [compraId, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(compraResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al crear orden de compra' });
  } finally {
    client.release();
  }
});

// PUT /api/compras/:id/recibir - Receive purchase (updates stock)
router.put('/:id/recibir', authorizeRoles('administrador', 'empleado'), async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const compra = await client.query('SELECT * FROM compras WHERE id = $1', [req.params.id]);
    if (compra.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Compra no encontrada' }); }
    if (compra.rows[0].estado === 'recibida') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Compra ya recibida' }); }

    const items = await client.query('SELECT * FROM detalle_compras WHERE compra_id = $1', [req.params.id]);
    
    for (const item of items.rows) {
      const stockResult = await client.query('SELECT stock FROM productos WHERE id = $1', [item.producto_id]);
      const stockAnterior = stockResult.rows[0].stock;
      const stockNuevo = stockAnterior + item.cantidad;

      await client.query('UPDATE productos SET stock = $1, precio_compra = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [stockNuevo, item.precio_unitario, item.producto_id]);

      await client.query(
        `INSERT INTO inventario_movimientos (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia, usuario_id)
         VALUES ($1, 'entrada', $2, $3, $4, $5, $6)`,
        [item.producto_id, item.cantidad, stockAnterior, stockNuevo, `compra_${req.params.id}`, req.user?.id]
      );
    }

    await client.query("UPDATE compras SET estado = 'recibida', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [req.params.id]);
    await client.query('COMMIT');
    res.json({ message: 'Compra recibida y stock actualizado' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al recibir compra' });
  } finally {
    client.release();
  }
});

// GET /api/compras
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { estado, page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    let query = `SELECT c.*, p.nombre as proveedor_nombre, u.nombre as usuario_nombre
                 FROM compras c JOIN proveedores p ON c.proveedor_id = p.id
                 JOIN usuarios u ON c.usuario_id = u.id WHERE 1=1`;
    const params: any[] = [];
    let paramCount = 0;

    if (estado) { paramCount++; query += ` AND c.estado = $${paramCount}`; params.push(estado); }

    const countResult = await pool.query(query.replace(/SELECT c\.\*.*FROM/, 'SELECT COUNT(*) FROM'), params);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY c.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit as string), offset);

    const result = await pool.query(query, params);
    res.json({ data: result.rows, total, page: parseInt(page as string) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener compras' });
  }
});

// GET /api/compras/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT c.*, p.nombre as proveedor_nombre, u.nombre as usuario_nombre,
       CONCAT('[', GROUP_CONCAT(JSON_OBJECT('id', dc.id, 'producto_id', dc.producto_id, 'nombre', pr.nombre,
       'cantidad', dc.cantidad, 'precio_unitario', dc.precio_unitario, 'subtotal', dc.subtotal)), ']') as items
       FROM compras c
       JOIN proveedores p ON c.proveedor_id = p.id
       JOIN usuarios u ON c.usuario_id = u.id
       JOIN detalle_compras dc ON c.id = dc.compra_id
       JOIN productos pr ON dc.producto_id = pr.id
       WHERE c.id = $1
       GROUP BY c.id, p.nombre, u.nombre`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Compra no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener compra' });
  }
});

export default router;
