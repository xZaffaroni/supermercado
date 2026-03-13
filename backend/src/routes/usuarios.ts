import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/database';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);
router.use(authorizeRoles('administrador'));

// GET /api/usuarios
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.rol_id, r.nombre as rol, u.activo, u.ultimo_login, u.created_at
       FROM usuarios u JOIN roles r ON u.rol_id = r.id ORDER BY u.nombre ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// POST /api/usuarios
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, email, password, rol_id } = req.body;
    if (!nombre || !email || !password || !rol_id) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol_id) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol_id, activo, created_at',
      [nombre, email, hash, rol_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(400).json({ error: 'El email ya está registrado' });
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// PUT /api/usuarios/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, email, rol_id, activo, password } = req.body;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE usuarios SET password = $1 WHERE id = $2', [hash, req.params.id]);
    }
    const result = await pool.query(
      `UPDATE usuarios SET nombre=$1, email=$2, rol_id=$3, activo=$4, updated_at=CURRENT_TIMESTAMP
       WHERE id=$5 RETURNING id, nombre, email, rol_id, activo`,
      [nombre, email, rol_id, activo, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(400).json({ error: 'El email ya está registrado' });
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// DELETE /api/usuarios/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (parseInt(req.params.id) === req.user?.id) {
      return res.status(400).json({ error: 'No puede eliminar su propio usuario' });
    }
    await pool.query('UPDATE usuarios SET activo = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Usuario desactivado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al desactivar usuario' });
  }
});

// GET /api/usuarios/roles
router.get('/roles', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM roles ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener roles' });
  }
});

export default router;
