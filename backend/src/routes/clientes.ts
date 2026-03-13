import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// GET /api/clientes
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    let query = 'SELECT * FROM clientes WHERE 1=1';
    const params: any[] = [];
    let p = 0;

    if (search) {
      p++;
      query += ` AND (nombre ILIKE $${p} OR telefono ILIKE $${p} OR email ILIKE $${p})`;
      params.push(`%${search}%`);
    }

    const countResult = await pool.query(query.replace('SELECT *', 'SELECT COUNT(*)'), params);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY nombre ASC LIMIT $${p + 1} OFFSET $${p + 2}`;
    params.push(parseInt(limit as string), offset);

    const result = await pool.query(query, params);
    res.json({ data: result.rows, total, page: parseInt(page as string) });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// GET /api/clientes/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM clientes WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

// GET /api/clientes/:id/compras 
router.get('/:id/compras', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT v.*, u.nombre as cajero_nombre FROM ventas v
       JOIN usuarios u ON v.usuario_id = u.id
       WHERE v.cliente_id = $1 ORDER BY v.created_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial de compras' });
  }
});

// POST /api/clientes
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, telefono, email, direccion, notas } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre es requerido' });
    const result = await pool.query(
      'INSERT INTO clientes (nombre, telefono, email, direccion, notas) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nombre, telefono, email, direccion, notas]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// PUT /api/clientes/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, telefono, email, direccion, notas } = req.body;
    const result = await pool.query(
      'UPDATE clientes SET nombre=$1, telefono=$2, email=$3, direccion=$4, notas=$5, updated_at=CURRENT_TIMESTAMP WHERE id=$6 RETURNING *',
      [nombre, telefono, email, direccion, notas, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

// DELETE /api/clientes/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('DELETE FROM clientes WHERE id = $1', [req.params.id]);
    res.json({ message: 'Cliente eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

export default router;
