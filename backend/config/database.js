import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Configuração do pool de conexões MySQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'historico_alphahall',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// Criar pool de conexões
const pool = mysql.createPool(dbConfig);

// Testar conexão ao iniciar
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conectado ao MySQL:', dbConfig.database);
    connection.release();
  } catch (error) {
    console.error('❌ Erro ao conectar ao MySQL:', error.message);
    process.exit(1);
  }
})();

// Função helper para executar queries
export async function query(sql, params = []) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('❌ Erro na query:', error.message);
    throw error;
  }
}

// Função helper para executar queries com streaming (grandes volumes)
export async function queryStream(sql, params = []) {
  const connection = await pool.getConnection();
  try {
    const stream = connection.query(sql, params).stream();
    return { stream, connection };
  } catch (error) {
    connection.release();
    throw error;
  }
}

export default pool;
