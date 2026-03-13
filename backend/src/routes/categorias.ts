import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// GET /api/categorias
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM categorias ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// POST /api/categorias
router.post('/', authorizeRoles('administrador'), async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre es requerido' });
    const result = await pool.query(
      'INSERT INTO categorias (nombre, descripcion) VALUES ($1, $2) RETURNING *',
      [nombre, descripcion]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(400).json({ error: 'La categoría ya existe' });
    res.status(500).json({ error: 'Error al crear categoría' });
  }
});

// PUT /api/categorias/:id
router.put('/:id', authorizeRoles('administrador'), async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, descripcion, activo } = req.body;
    const result = await pool.query(
      'UPDATE categorias SET nombre=$1, descripcion=$2, activo=$3 WHERE id=$4 RETURNING *',
      [nombre, descripcion, activo, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
});

// DELETE /api/categorias/:id
router.delete('/:id', authorizeRoles('administrador'), async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('UPDATE categorias SET activo = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Categoría desactivada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al desactivar categoría' });
  }
});

export default router;
