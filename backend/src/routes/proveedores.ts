import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// GET /api/proveedores
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM proveedores WHERE activo = true';
    const params: any[] = [];
    if (search) {
      query += ' AND (nombre ILIKE $1 OR contacto ILIKE $1)';
      params.push(`%${search}%`);
    }
    query += ' ORDER BY nombre ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
});

// GET /api/proveedores/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM proveedores WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener proveedor' });
  }
});

// GET /api/proveedores/:id/productos
router.get('/:id/productos', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM productos WHERE proveedor_id = $1 AND activo = true ORDER BY nombre ASC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener productos del proveedor' });
  }
});

// POST /api/proveedores
router.post('/', authorizeRoles('administrador', 'empleado'), async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, telefono, email, direccion, contacto, notas } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre es requerido' });
    const result = await pool.query(
      'INSERT INTO proveedores (nombre, telefono, email, direccion, contacto, notas) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [nombre, telefono, email, direccion, contacto, notas]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
});

// PUT /api/proveedores/:id
router.put('/:id', authorizeRoles('administrador', 'empleado'), async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, telefono, email, direccion, contacto, notas, activo } = req.body;
    const result = await pool.query(
      `UPDATE proveedores SET nombre=$1, telefono=$2, email=$3, direccion=$4, contacto=$5, notas=$6, activo=$7, updated_at=CURRENT_TIMESTAMP
       WHERE id=$8 RETURNING *`,
      [nombre, telefono, email, direccion, contacto, notas, activo, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
});

// DELETE /api/proveedores/:id
router.delete('/:id', authorizeRoles('administrador'), async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('UPDATE proveedores SET activo = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Proveedor desactivado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al desactivar proveedor' });
  }
});

export default router;
