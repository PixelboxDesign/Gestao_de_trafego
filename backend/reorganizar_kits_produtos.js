import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function reorganizarCatalogos() {
  console.log('🔄 REORGANIZAÇÃO DE CATÁLOGOS - KITS E PRODUTOS');
  console.log('═══════════════════════════════════════════════════════\n');

  // Conectar ao banco
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'vps.hawktecnologia.com',
    user: process.env.DB_USER || 'hawktec_alpha_log',
    password: process.env.DB_PASSWORD || 'Alpha@3030',
    database: process.env.DB_NAME || 'hawktec_alphahall'
  });

  console.log('✅ Conectado ao banco de dados\n');

  // Buscar todos os produtos
  const [produtos] = await connection.execute(`
    SELECT 
      id,
      produto_id,
      codigo_sku,
      nome,
      tipo,
      eh_kit
    FROM relacao_produtos_kits_disparo_luna
    WHERE nome IS NOT NULL
    ORDER BY tipo DESC, nome ASC
  `);

  console.log(`📦 Total de produtos encontrados: ${produtos.length}`);
  
  const kits = produtos.filter(p => p.tipo === 'kit_composto' || p.eh_kit);
  const produtosIndividuais = produtos.filter(p => p.tipo === 'produto_individual' || !p.eh_kit);
  
  console.log(`   → Kits: ${kits.length}`);
  console.log(`   → Produtos individuais: ${produtosIndividuais.length}\n`);

  const baseDir = path.join(__dirname, '..', 'catalogos', 'Alphahall');
  const kitsDir = path.join(baseDir, 'kits');
  const produtosDir = path.join(baseDir, 'produtos');

  // Criar pastas se não existirem
  if (!fs.existsSync(kitsDir)) {
    fs.mkdirSync(kitsDir, { recursive: true });
    console.log('📁 Pasta "kits/" criada');
  }
  
  if (!fs.existsSync(produtosDir)) {
    fs.mkdirSync(produtosDir, { recursive: true });
    console.log('📁 Pasta "produtos/" criada\n');
  }

  // Função para sanitizar nome de pasta
  function sanitizarNome(nome) {
    return nome
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 150);
  }

  // Função para mover pasta
  function moverPasta(nomeOriginal, destino) {
    const origem = path.join(baseDir, nomeOriginal);
    
    if (fs.existsSync(origem)) {
      const stats = fs.statSync(origem);
      if (stats.isDirectory()) {
        try {
          // Mover pasta
          fs.renameSync(origem, destino);
          return true;
        } catch (err) {
          console.warn(`   ⚠️  Erro ao mover "${nomeOriginal}": ${err.message}`);
          return false;
        }
      }
    }
    return false;
  }

  // Processar kits
  console.log('📦 Movendo KITS...');
  let kitsMovidos = 0;
  let kitsCriados = 0;

  for (const kit of kits) {
    const nomePasta = sanitizarNome(kit.nome);
    const destino = path.join(kitsDir, nomePasta);
    
    // Tenta mover pasta existente
    if (moverPasta(nomePasta, destino)) {
      kitsMovidos++;
    } else {
      // Cria pasta nova se não existir
      if (!fs.existsSync(destino)) {
        fs.mkdirSync(destino, { recursive: true });
        kitsCriados++;
      }
    }
  }

  console.log(`   ✅ Kits movidos: ${kitsMovidos}`);
  console.log(`   ✅ Kits criados: ${kitsCriados}\n`);

  // Processar produtos
  console.log('📦 Movendo PRODUTOS...');
  let produtosMovidos = 0;
  let produtosCriados = 0;

  for (const produto of produtosIndividuais) {
    const nomePasta = sanitizarNome(produto.nome);
    const destino = path.join(produtosDir, nomePasta);
    
    // Tenta mover pasta existente
    if (moverPasta(nomePasta, destino)) {
      produtosMovidos++;
    } else {
      // Cria pasta nova se não existir
      if (!fs.existsSync(destino)) {
        fs.mkdirSync(destino, { recursive: true });
        produtosCriados++;
      }
    }
  }

  console.log(`   ✅ Produtos movidos: ${produtosMovidos}`);
  console.log(`   ✅ Produtos criados: ${produtosCriados}\n`);

  await connection.end();

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ REORGANIZAÇÃO CONCLUÍDA!');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📁 Estrutura criada:`);
  console.log(`   ${kitsDir}`);
  console.log(`   ${produtosDir}`);
  console.log(`\n📊 Totais:`);
  console.log(`   Kits: ${kits.length} (${kitsMovidos} movidos + ${kitsCriados} criados)`);
  console.log(`   Produtos: ${produtosIndividuais.length} (${produtosMovidos} movidos + ${produtosCriados} criados)`);
}

reorganizarCatalogos()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
  });
