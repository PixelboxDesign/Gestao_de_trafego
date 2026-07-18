import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

// Quando rodando LOCAL: LOCAL_HOST=localhost e DB_HOST=localhost → usa o pool principal
// Quando rodando no Render: LOCAL_HOST=localhost mas DB_HOST=162.x.x.x → usa pool separado
//
// Se DB_HOST === LOCAL_HOST (ambos localhost), queryLocal usa o mesmo pool do database.js
// para evitar conexões duplicadas.

let _poolLocal = null;

function isRunningLocal() {
  const dbHost    = (process.env.DB_HOST    || '').trim();
  const localHost = (process.env.LOCAL_HOST || '').trim();
  return dbHost === 'localhost' || dbHost === '127.0.0.1';
}

export function getLocalPool() {
  if (isRunningLocal()) {
    // Rodando local: reusar o pool principal (já aponta para localhost)
    return null; // sinaliza para usar o pool principal
  }

  const host = process.env.LOCAL_HOST;
  if (!host) return null; // Render sem banco local configurado

  if (!_poolLocal) {
    _poolLocal = mysql.createPool({
      host,
      port:     parseInt(process.env.LOCAL_PORT) || 3306,
      user:     process.env.LOCAL_USER           || 'root',
      password: process.env.LOCAL_PASS           || '',
      database: process.env.LOCAL_DB             || 'histórico_alphahall',
      waitForConnections: true,
      connectionLimit: 5,
      connectTimeout: 15000,
    });
    console.log(`✅ Pool local conectado: ${host}/${process.env.LOCAL_DB}`);
  }
  return _poolLocal;
}

export async function queryLocal(sql, params = []) {
  if (isRunningLocal()) {
    // Rodar local: usar pool principal importado dinamicamente para evitar circular
    const { default: pool } = await import('./database.js');
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch(e) {
      console.warn('⚠️  queryLocal (local) erro:', e.message);
      return [];
    }
  }

  const pool = getLocalPool();
  if (!pool) return [];
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch(e) {
    console.warn('⚠️  queryLocal (remoto) erro:', e.message);
    return [];
  }
}
