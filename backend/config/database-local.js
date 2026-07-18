import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

// Pool para o banco LOCAL (localhost) — contém nfe_xml_importado / nfe_xml_itens
// Só usado quando o sistema roda localmente.
// Em produção (Render), LOCAL_HOST não estará definido, então retorna null
// e o código trata isso graciosamente.

let _poolLocal = null;

export function getLocalPool() {
  const host = process.env.LOCAL_HOST;
  if (!host) return null; // produção: sem banco local

  if (!_poolLocal) {
    _poolLocal = mysql.createPool({
      host,
      port:     parseInt(process.env.LOCAL_PORT) || 3306,
      user:     process.env.LOCAL_USER           || 'root',
      password: process.env.LOCAL_PASS           || '',
      database: process.env.LOCAL_DB             || 'histórico_alphahall',
      waitForConnections: true,
      connectionLimit: 5,
      connectTimeout: 10000,
    });
    console.log(`✅ Pool local conectado: ${host}/${process.env.LOCAL_DB}`);
  }
  return _poolLocal;
}

export async function queryLocal(sql, params = []) {
  const pool = getLocalPool();
  if (!pool) return []; // sem banco local disponível
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch(e) {
    console.warn('⚠️  queryLocal erro:', e.message);
    return [];
  }
}
