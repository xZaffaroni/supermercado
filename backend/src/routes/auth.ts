import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const result = await pool.query(
      `SELECT u.*, r.nombre as rol FROM usuarios u 
       JOIN roles r ON u.rol_id = r.id 
       WHERE u.email = $1 AND u.activo = true`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Update last login
    await pool.query('UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol, rol_id: user.rol_id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        rol_id: user.rol_id
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.rol_id, r.nombre as rol, u.activo, u.ultimo_login
       FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE u.id = $1`,
      [req.user?.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await pool.query('SELECT password FROM usuarios WHERE id = $1', [req.user?.id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!valid) return res.status(400).json({ error: 'Contraseña actual incorrecta' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE usuarios SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hash, req.user?.id]);

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

export default router;
