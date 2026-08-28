const fs = require('fs');
const path = require('path');

const catalogoPath = 'F:\\luna_cosmeticos\\catalogos\\Alphahall';
const kitsPath = path.join(catalogoPath, 'kits');
const produtosPath = path.join(catalogoPath, 'produtos');

console.log('🧹 Limpando estrutura de catálogos Alphahall...\n');

// Lista todos os itens no diretório Alphahall
const items = fs.readdirSync(catalogoPath, { withFileTypes: true });

let movidos = 0;
let removidos = 0;

items.forEach(item => {
  const itemPath = path.join(catalogoPath, item.name);
  
  // Ignora as pastas kits e produtos
  if (item.name === 'kits' || item.name === 'produtos') {
    console.log(`✅ Mantendo pasta: ${item.name}`);
    return;
  }
  
  if (item.isDirectory()) {
    // Verifica se já existe nas subpastas
    const existeEmKits = fs.existsSync(path.join(kitsPath, item.name));
    const existeEmProdutos = fs.existsSync(path.join(produtosPath, item.name));
    
    if (existeEmKits || existeEmProdutos) {
      console.log(`🗑️  Removendo duplicata: ${item.name}`);
      fs.rmSync(itemPath, { recursive: true, force: true });
      removidos++;
    } else {
      console.log(`⚠️  AVISO: Pasta solta encontrada: ${item.name}`);
      console.log(`   Esta pasta não está em kits/ nem em produtos/`);
      console.log(`   Removendo pois não foi migrada...`);
      fs.rmSync(itemPath, { recursive: true, force: true });
      removidos++;
    }
  } else {
    // Remove arquivos soltos
    console.log(`🗑️  Removendo arquivo solto: ${item.name}`);
    fs.unlinkSync(itemPath);
    removidos++;
  }
});

console.log('\n📊 Resultado:');
console.log(`   Itens removidos: ${removidos}`);
console.log(`\n✅ Estrutura limpa! Apenas kits/ e produtos/ permanecem.`);

// Verifica estrutura final
console.log('\n📁 Estrutura final:');
const finalItems = fs.readdirSync(catalogoPath);
finalItems.forEach(item => {
  const itemPath = path.join(catalogoPath, item);
  const stats = fs.statSync(itemPath);
  if (stats.isDirectory()) {
    const subItems = fs.readdirSync(itemPath);
    console.log(`   ${item}/ (${subItems.length} itens)`);
  }
});
