import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

async function mapearBanco() {
  console.log('🔍 MAPEANDO TODO O BANCO DE DADOS...\n');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log(`✅ Conectado ao banco: ${process.env.DB_NAME}@${process.env.DB_HOST}\n`);

  // Listar todas as tabelas
  const [tables] = await connection.query('SHOW TABLES');
  
  const mapeamento = {};
  const resultado = [];

  for (const tableRow of tables) {
    const tableName = Object.values(tableRow)[0];
    
    // Pegar colunas da tabela
    const [columns] = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
    
    const colunas = columns.map(col => ({
      nome: col.Field,
      tipo: col.Type,
      nulo: col.Null,
      key: col.Key,
      default: col.Default
    }));

    mapeamento[tableName] = colunas;
    
    resultado.push(`\n${'='.repeat(80)}`);
    resultado.push(`TABELA: ${tableName}`);
    resultado.push(`${'='.repeat(80)}`);
    resultado.push(`Total de colunas: ${colunas.length}\n`);
    
    colunas.forEach(col => {
      resultado.push(`  📌 ${col.nome.padEnd(40)} | ${col.tipo.padEnd(20)} | ${col.nulo === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log(`✅ ${tableName} (${colunas.length} colunas)`);
  }

  // Salvar em arquivo
  const arquivo = join(__dirname, 'MAPEAMENTO-BANCO.txt');
  fs.writeFileSync(arquivo, resultado.join('\n'), 'utf-8');
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 RESUMO:`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Total de tabelas: ${tables.length}`);
  console.log(`Arquivo gerado: MAPEAMENTO-BANCO.txt`);
  console.log(`${'='.repeat(80)}`);

  await connection.end();
}

mapearBanco().catch(console.error);
