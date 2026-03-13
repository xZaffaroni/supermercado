import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// GET /api/productos
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, categoria, activo, page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    let query = `
      SELECT p.*, c.nombre as categoria_nombre, pr.nombre as proveedor_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (p.nombre ILIKE $${paramCount} OR p.codigo_barras = $${paramCount + 1})`;
      params.push(`%${search}%`);
      paramCount++;
      params.push(search);
    }
    if (categoria) {
      paramCount++;
      query += ` AND p.categoria_id = $${paramCount}`;
      params.push(categoria);
    }
    if (activo !== undefined) {
      paramCount++;
      query += ` AND p.activo = $${paramCount}`;
      params.push(activo === 'true');
    }

    // Count total
    const countResult = await pool.query(
      query.replace(/SELECT p\.\*.*FROM/, 'SELECT COUNT(*) FROM'),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY p.nombre ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit as string), offset);

    const result = await pool.query(query, params);
    res.json({ data: result.rows, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /api/productos/barcode/:code
router.get('/barcode/:code', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.nombre as categoria_nombre FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       WHERE p.codigo_barras = $1 AND p.activo = true`,
      [req.params.code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al buscar producto' });
  }
});

// GET /api/productos/low-stock
router.get('/low-stock', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.nombre as categoria_nombre FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       WHERE p.stock <= p.stock_minimo AND p.activo = true
       ORDER BY p.stock ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener productos con stock bajo' });
  }
});

// GET /api/productos/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.nombre as categoria_nombre, pr.nombre as proveedor_nombre
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// POST /api/productos
router.post('/', authorizeRoles('administrador', 'empleado'), async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, codigo_barras, precio_compra, precio_venta, stock, stock_minimo, categoria_id, proveedor_id, imagen_url } = req.body;
    
    if (!nombre || precio_venta === undefined) {
      return res.status(400).json({ error: 'Nombre y precio de venta son requeridos' });
    }

    const result = await pool.query(
      `INSERT INTO productos (nombre, codigo_barras, precio_compra, precio_venta, stock, stock_minimo, categoria_id, proveedor_id, imagen_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [nombre, codigo_barras, precio_compra || 0, precio_venta, stock || 0, stock_minimo || 5, categoria_id, proveedor_id, imagen_url]
    );

    // Register inventory movement
    if (stock && stock > 0) {
      await pool.query(
        `INSERT INTO inventario_movimientos (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia, usuario_id)
         VALUES ($1, 'entrada', $2, 0, $2, 'stock_inicial', $3)`,
        [result.rows[0].id, stock, req.user?.id]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'El código de barras ya existe' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// PUT /api/productos/:id
router.put('/:id', authorizeRoles('administrador', 'empleado'), async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, codigo_barras, precio_compra, precio_venta, stock_minimo, categoria_id, proveedor_id, imagen_url, activo } = req.body;
    const result = await pool.query(
      `UPDATE productos SET nombre=$1, codigo_barras=$2, precio_compra=$3, precio_venta=$4, 
       stock_minimo=$5, categoria_id=$6, proveedor_id=$7, imagen_url=$8, activo=$9, updated_at=CURRENT_TIMESTAMP
       WHERE id=$10 RETURNING *`,
      [nombre, codigo_barras, precio_compra, precio_venta, stock_minimo, categoria_id, proveedor_id, imagen_url, activo, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'El código de barras ya existe' });
    }
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// DELETE /api/productos/:id (soft delete)
router.delete('/:id', authorizeRoles('administrador'), async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('UPDATE productos SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [req.params.id]);
    res.json({ message: 'Producto desactivado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al desactivar producto' });
  }
});

export default router;
