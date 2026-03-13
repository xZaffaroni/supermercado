import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// POST /api/cajas/abrir - Open cash register
router.post('/abrir', authorizeRoles('administrador', 'cajero'), async (req: AuthRequest, res: Response) => {
  try {
    // Check if user already has an open register
    const existing = await pool.query(
      "SELECT * FROM cajas WHERE usuario_id = $1 AND estado = 'abierta'",
      [req.user?.id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Ya tiene una caja abierta', caja: existing.rows[0] });
    }

    const { monto_inicial = 0 } = req.body;
    const result = await pool.query(
      'INSERT INTO cajas (usuario_id, monto_inicial) VALUES ($1, $2) RETURNING *',
      [req.user?.id, monto_inicial]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al abrir caja' });
  }
});

// PUT /api/cajas/cerrar/:id - Close cash register
router.put('/cerrar/:id', authorizeRoles('administrador', 'cajero'), async (req: AuthRequest, res: Response) => {
  try {
    const caja = await pool.query('SELECT * FROM cajas WHERE id = $1', [req.params.id]);
    if (caja.rows.length === 0) return res.status(404).json({ error: 'Caja no encontrada' });
    if (caja.rows[0].estado === 'cerrada') return res.status(400).json({ error: 'Caja ya está cerrada' });

    const { notas } = req.body;
    const cajaData = caja.rows[0];
    const montoFinal = parseFloat(cajaData.monto_inicial) + parseFloat(cajaData.total_efectivo) - parseFloat(cajaData.total_retiros);

    const result = await pool.query(
      `UPDATE cajas SET estado = 'cerrada', monto_final = $1, notas = $2, cerrada_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [montoFinal, notas, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al cerrar caja' });
  }
});

// POST /api/cajas/:id/retiro - Cash withdrawal
router.post('/:id/retiro', authorizeRoles('administrador', 'cajero'), async (req: AuthRequest, res: Response) => {
  try {
    const { monto, motivo } = req.body;
    if (!monto || monto <= 0) return res.status(400).json({ error: 'Monto debe ser mayor a 0' });

    const caja = await pool.query("SELECT * FROM cajas WHERE id = $1 AND estado = 'abierta'", [req.params.id]);
    if (caja.rows.length === 0) return res.status(404).json({ error: 'Caja no encontrada o cerrada' });

    await pool.query(
      'INSERT INTO retiros_caja (caja_id, monto, motivo, usuario_id) VALUES ($1, $2, $3, $4)',
      [req.params.id, monto, motivo, req.user?.id]
    );

    await pool.query(
      'UPDATE cajas SET total_retiros = total_retiros + $1 WHERE id = $2',
      [monto, req.params.id]
    );

    res.json({ message: 'Retiro registrado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar retiro' });
  }
});

// GET /api/cajas/actual - Get current open register for user
router.get('/actual', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.nombre as usuario_nombre,
       (SELECT CONCAT('[', GROUP_CONCAT(JSON_OBJECT('id', r.id, 'monto', r.monto, 'motivo', r.motivo, 'created_at', r.created_at)), ']')
        FROM retiros_caja r WHERE r.caja_id = c.id) as retiros
       FROM cajas c JOIN usuarios u ON c.usuario_id = u.id
       WHERE c.usuario_id = $1 AND c.estado = 'abierta'`,
      [req.user?.id]
    );
    if (result.rows.length === 0) return res.json(null);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('ERROR DATABASE EN CAJAS/ACTUAL:', err);
    res.status(500).json({ error: 'Error al obtener caja actual' });
  }
});

// GET /api/cajas - List all registers
router.get('/', authorizeRoles('administrador'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const result = await pool.query(
      `SELECT c.*, u.nombre as usuario_nombre FROM cajas c
       JOIN usuarios u ON c.usuario_id = u.id
       ORDER BY c.abierta_at DESC LIMIT $1 OFFSET $2`,
      [parseInt(limit as string), offset]
    );
    const countResult = await pool.query('SELECT COUNT(*) FROM cajas');
    res.json({ data: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page as string) });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener cajas' });
  }
});

// GET /api/cajas/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.nombre as usuario_nombre,
       (SELECT CONCAT('[', GROUP_CONCAT(JSON_OBJECT('id', r.id, 'monto', r.monto, 'motivo', r.motivo, 'created_at', r.created_at)), ']')
        FROM retiros_caja r WHERE r.caja_id = c.id) as retiros
       FROM cajas c JOIN usuarios u ON c.usuario_id = u.id WHERE c.id = $1 GROUP BY c.id, u.nombre`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Caja no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener caja' });
  }
});

export default router;
