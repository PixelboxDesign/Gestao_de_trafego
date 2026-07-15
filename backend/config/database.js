import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'hawktec_alpha-ecommerce',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Evitar timeout de conexão ociosa
  connectTimeout: 30000,
});

// Testar conexão ao iniciar
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL conectado:', process.env.DB_NAME);
    conn.release();
  })
  .catch(err => {
    console.error('❌ Falha ao conectar MySQL:', err.message);
    // Não encerrar o processo — Render pode tentar reconectar
  });

/**
 * Executa uma query SQL.
 * USA pool.query() (não execute) para aceitar parâmetros Number sem conversão.
 * pool.execute() usa prepared statements binários que rejeitam Numbers em alguns drivers.
 */
export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

export default pool;
