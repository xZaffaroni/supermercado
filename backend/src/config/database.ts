import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'supermercado',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Polyfill para compatibilidad con el código PG existente (por ej: pool.query(sql, params).rows)
const pgCompatiblePool = {
  query: async (sql: string, params: any[] = []) => {
    // Reemplazar sintaxis $1, $2 de postgres a sintaxis ? de mysql
    let mysqlSql = sql;
    params.forEach((_, idx) => {
      mysqlSql = mysqlSql.replace(`$${idx + 1}`, '?');
    });

    // Reemplazar ILIKE de Postgres por LIKE en MySQL
    mysqlSql = mysqlSql.replace(/ILIKE/g, 'LIKE');
    // Reemplazar CURRENT_TIMESTAMP de PG cuando se usa DEFAULT por NOW()
    // Retornamos un objeto con .rows como espera el código actual
    const [rows] = await pool.query(mysqlSql, params);
    
    // Si rows es un array (SELECT), lo devolvemos tal cual
    if (Array.isArray(rows)) {
      return { rows, rowCount: rows.length };
    } 
    // Si rows es un objeto de resultado (INSERT/UPDATE/DELETE)
    else {
      const result = rows as any;
      // Para simular el RETURNING * de Postgres
      if (sql.includes('RETURNING *') && result.insertId) {
        // En mysql toca consultar por el id si es INSERT
        const TableMatch = sql.match(/INSERT INTO\s+(\w+)/i) || sql.match(/UPDATE\s+(\w+)/i);
        const table = TableMatch ? TableMatch[1] : '';
        if (table) {
          const [insertedRows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [result.insertId]);
          return { rows: insertedRows as any[], rowCount: 1 };
        }
      }
      return { rows: [], rowCount: result.affectedRows };
    }
  },
  connect: async () => {
    const connection = await pool.getConnection();
    return {
      query: async (sql: string, params: any[] = []) => {
        let mysqlSql = sql;
        params.forEach((_, idx) => {
          mysqlSql = mysqlSql.replace(`$${idx + 1}`, '?');
        });
        mysqlSql = mysqlSql.replace(/ILIKE/g, 'LIKE');
        const [rows] = await connection.query(mysqlSql, params);
        if (Array.isArray(rows)) return { rows };
        
        const result = rows as any;
        if (sql.includes('RETURNING *') && result.insertId) {
           const TableMatch = sql.match(/INSERT INTO\s+(\w+)/i) || sql.match(/UPDATE\s+(\w+)/i);
           const table = TableMatch ? TableMatch[1] : '';
           if (table) {
             const [insertedRows] = await connection.query(`SELECT * FROM ${table} WHERE id = ?`, [result.insertId]);
             return { rows: insertedRows as any[] };
           }
        }
        return { rows: [] };
      },
      release: () => connection.release(),
      commit: () => connection.query('COMMIT'),
      rollback: () => connection.query('ROLLBACK'),
    };
  }
};

export default pgCompatiblePool;
