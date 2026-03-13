import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// POST /api/ventas - Create a sale
router.post('/', authorizeRoles('administrador', 'cajero'), async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { items, cliente_id, caja_id, metodo_pago, descuento = 0, monto_recibido = 0 } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Debe incluir al menos un producto' });
    }

    // Generate ticket number
    const ticketResult = await client.query("SELECT COALESCE(MAX(CAST(SUBSTRING(numero_ticket FROM 2) AS INTEGER)), 0) + 1 as next FROM ventas");
    const ticketNum = `T${String(ticketResult.rows[0].next).padStart(8, '0')}`;

    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      const prodResult = await client.query('SELECT precio_venta, stock, nombre FROM productos WHERE id = $1 AND activo = true', [item.producto_id]);
      if (prodResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Producto ID ${item.producto_id} no encontrado o inactivo` });
      }
      if (prodResult.rows[0].stock < item.cantidad) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Stock insuficiente para "${prodResult.rows[0].nombre}". Disponible: ${prodResult.rows[0].stock}` });
      }
      item.precio_unitario = prodResult.rows[0].precio_venta;
      item.subtotal = item.precio_unitario * item.cantidad - (item.descuento || 0);
      subtotal += item.subtotal;
    }

    const total = subtotal - descuento;
    const cambio = metodo_pago === 'efectivo' ? monto_recibido - total : 0;

    // Insert sale
    const ventaResult = await client.query(
      `INSERT INTO ventas (numero_ticket, usuario_id, cliente_id, caja_id, subtotal, descuento, total, metodo_pago, monto_recibido, cambio)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [ticketNum, req.user?.id, cliente_id, caja_id, subtotal, descuento, total, metodo_pago, monto_recibido, cambio]
    );
    const ventaId = ventaResult.rows[0].id;

    // Insert details and update stock
    for (const item of items) {
      await client.query(
        `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, descuento, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [ventaId, item.producto_id, item.cantidad, item.precio_unitario, item.descuento || 0, item.subtotal]
      );

      // Update stock
      const stockResult = await client.query('SELECT stock FROM productos WHERE id = $1', [item.producto_id]);
      const stockAnterior = stockResult.rows[0].stock;
      const stockNuevo = stockAnterior - item.cantidad;

      await client.query('UPDATE productos SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [stockNuevo, item.producto_id]);

      // Register inventory movement
      await client.query(
        `INSERT INTO inventario_movimientos (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia, usuario_id)
         VALUES ($1, 'salida', $2, $3, $4, $5, $6)`,
        [item.producto_id, item.cantidad, stockAnterior, stockNuevo, `venta_${ventaId}`, req.user?.id]
      );
    }

    // Update cash register totals
    if (caja_id) {
      const metodoCol = metodo_pago === 'efectivo' ? 'total_efectivo' : metodo_pago === 'tarjeta' ? 'total_tarjeta' : 'total_transferencia';
      await client.query(
        `UPDATE cajas SET total_ventas = total_ventas + $1, ${metodoCol} = ${metodoCol} + $1 WHERE id = $2`,
        [total, caja_id]
      );
    }

    await client.query('COMMIT');

    // Get full sale data
    const fullSale = await pool.query(
      `SELECT v.*, u.nombre as cajero_nombre, 
       CONCAT('[', GROUP_CONCAT(JSON_OBJECT('producto_id', dv.producto_id, 'nombre', p.nombre, 'cantidad', dv.cantidad, 
       'precio_unitario', dv.precio_unitario, 'descuento', dv.descuento, 'subtotal', dv.subtotal)), ']') as items
       FROM ventas v
       JOIN usuarios u ON v.usuario_id = u.id
       JOIN detalle_ventas dv ON v.id = dv.venta_id
       JOIN productos p ON dv.producto_id = p.id
       WHERE v.id = $1
       GROUP BY v.id, u.nombre`,
      [ventaId]
    );

    res.status(201).json(fullSale.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating sale:', err);
    res.status(500).json({ error: 'Error al crear la venta' });
  } finally {
    client.release();
  }
});

// GET /api/ventas
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { fecha_desde, fecha_hasta, estado, page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    let query = `SELECT v.*, u.nombre as cajero_nombre, cl.nombre as cliente_nombre
                 FROM ventas v 
                 JOIN usuarios u ON v.usuario_id = u.id
                 LEFT JOIN clientes cl ON v.cliente_id = cl.id WHERE 1=1`;
    const params: any[] = [];
    let p = 0;

    if (fecha_desde) { p++; query += ` AND v.created_at >= $${p}`; params.push(fecha_desde); }
    if (fecha_hasta) { p++; query += ` AND v.created_at <= $${p}`; params.push(fecha_hasta); }
    if (estado) { p++; query += ` AND v.estado = $${p}`; params.push(estado); }

    const countResult = await pool.query(query.replace(/SELECT v\.\*.*FROM/, 'SELECT COUNT(*) FROM'), params);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY v.created_at DESC LIMIT $${p + 1} OFFSET $${p + 2}`;
    params.push(parseInt(limit as string), offset);

    const result = await pool.query(query, params);
    res.json({ data: result.rows, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

// GET /api/ventas/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT v.*, u.nombre as cajero_nombre, cl.nombre as cliente_nombre,
       CONCAT('[', GROUP_CONCAT(JSON_OBJECT('id', dv.id, 'producto_id', dv.producto_id, 'nombre', p.nombre,
       'cantidad', dv.cantidad, 'precio_unitario', dv.precio_unitario, 'descuento', dv.descuento, 'subtotal', dv.subtotal)), ']') as items
       FROM ventas v
       JOIN usuarios u ON v.usuario_id = u.id
       LEFT JOIN clientes cl ON v.cliente_id = cl.id
       JOIN detalle_ventas dv ON v.id = dv.venta_id
       JOIN productos p ON dv.producto_id = p.id
       WHERE v.id = $1
       GROUP BY v.id, u.nombre, cl.nombre`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Venta no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener venta' });
  }
});

// PUT /api/ventas/:id/cancel
router.put('/:id/cancel', authorizeRoles('administrador'), async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get sale details
    const saleResult = await client.query('SELECT * FROM ventas WHERE id = $1', [req.params.id]);
    if (saleResult.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Venta no encontrada' }); }
    if (saleResult.rows[0].estado === 'cancelada') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Venta ya cancelada' }); }

    // Restore stock
    const items = await client.query('SELECT * FROM detalle_ventas WHERE venta_id = $1', [req.params.id]);
    for (const item of items.rows) {
      const stock = await client.query('SELECT stock FROM productos WHERE id = $1', [item.producto_id]);
      const stockAnterior = stock.rows[0].stock;
      const stockNuevo = stockAnterior + item.cantidad;
      await client.query('UPDATE productos SET stock = $1 WHERE id = $2', [stockNuevo, item.producto_id]);
      await client.query(
        `INSERT INTO inventario_movimientos (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia, usuario_id)
         VALUES ($1, 'entrada', $2, $3, $4, $5, $6)`,
        [item.producto_id, item.cantidad, stockAnterior, stockNuevo, `cancelacion_venta_${req.params.id}`, req.user?.id]
      );
    }

    await client.query("UPDATE ventas SET estado = 'cancelada' WHERE id = $1", [req.params.id]);
    await client.query('COMMIT');
    res.json({ message: 'Venta cancelada y stock restaurado' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al cancelar venta' });
  } finally {
    client.release();
  }
});

export default router;
