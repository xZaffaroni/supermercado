const mysql = require('mysql2/promise');
async function test() { 
  const pool = mysql.createPool({host: 'localhost', user: 'root', database: 'supermercado'}); 
  try { 
    await pool.query(`SELECT c.*, u.nombre as usuario_nombre, 
      (SELECT CONCAT('[', GROUP_CONCAT(JSON_OBJECT('id', r.id, 'monto', r.monto, 'motivo', r.motivo, 'created_at', r.created_at)), ']') 
       FROM retiros_caja r WHERE r.caja_id = c.id) as retiros 
       FROM cajas c JOIN usuarios u ON c.usuario_id = u.id 
       WHERE c.usuario_id = 1 AND c.estado = 'abierta'`); 
    console.log('OK, CONCAT FUNCIONA'); 
  } catch(e) { 
    console.error('SQL ERROR:', e.message); 
  } 
  process.exit(); 
} 
test();
