const fs = require('fs');

console.log('🔧 Criando arquivo HTML limpo do zero...\n');

// Lê o arquivo corrompido
let html = fs.readFileSync('frontend/disparo/public/index.html', 'utf8');

console.log('ANTES da limpeza:');
console.log('  - Title:', html.match(/<title>(.*?)<\/title>/)?.[1]);
console.log('  - Luna Cosm:', html.match(/Luna Cosm[^\s<]{0,15}/)?.[0]);

// CORREÇÃO MASSIVA - substitui TODOS os caracteres UTF-8 mal-encodados
const fixes = [
  // Cosméticos
  ['Cosm├®ticos', 'Cosméticos'],
  ['Cosm├®tico', 'Cosmético'],
  
  // é
  ['├®', 'é'],
  ['Ã©', 'é'],
  
  // ó
  ['├│', 'ó'],
  ['Ã³', 'ó'],
  
  // ã
  ['├úo', 'ão'],
  ['├úo', 'ão'],
  ['Ã£o', 'ão'],
  
  // ç
  ['├º', 'ç'],
  ['Ã§', 'ç'],
  
  // á
  ['├í', 'á'],
  ['Ã¡', 'á'],
  
  // à
  ['├á', 'à'],
  ['Ã ', 'à'],
  
  // ú
  ['├║', 'ú'],
  ['Ãº', 'ú'],
  
  // í
  ['├¡', 'í'],
  ['Ã­', 'í'],
  
  // ê
  ['├¬', 'ê'],
  ['Ãª', 'ê'],
  
  // â
  ['├ó', 'â'],
  ['Ã¢', 'â'],
  
  // ô
  ['├┤', 'ô'],
  ['Ã´', 'ô'],
  
  // õ
  ['├Áe', 'õe'],
  ['Ãµ', 'õ'],
  
  // Emojis comuns
  ['Γ¡ö', '🌙'], // lua
  ['ΓÜ╝', '💬'], // balão de fala
  ['Γô¼', '📱'], // celular
  ['Γôª', '📦'], // caixa
  ['Γº┤', '🧴'], // produto
  ['Γôñ', '📋'], // clipboard
  ['Γôè', '📊'], // gráfico
  ['Γô®', '📝'], // memo
  ['Γöä', '🔄'], // reload
  ['Γºó', '🚀'], // foguete
  ['ΓÜá', '⚠'], // aviso
  ['├ò├é', '━'], // linha
  ['├ò┬á', '—'], // travessão
  ['Γê¥', '✅'], // check
  ['Γêî', '❌'], // x
  ['Γò┐', '✓'], // check simples
  ['Γò¼', '✕'], // x simples
  
  // Outros caracteres especiais
  ['Γåê', '⇒'], // seta
  ['Γåà', '≤'], // menor igual
  ['Γò£', '⚡'], // raio
];

let totalFixes = 0;
fixes.forEach(([wrong, right]) => {
  const regex = new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const matches = html.match(regex);
  if (matches && matches.length > 0) {
    console.log(`  ✓ ${wrong} → ${right} (${matches.length}x)`);
    html = html.replace(regex, right);
    totalFixes += matches.length;
  }
});

console.log(`\n✅ Total: ${totalFixes} correções aplicadas\n`);

console.log('DEPOIS da limpeza:');
console.log('  - Title:', html.match(/<title>(.*?)<\/title>/)?.[1]);
console.log('  - Luna Cosm:', html.match(/Luna Cosm[^\s<]{0,15}/)?.[0]);

// Salva com UTF-8 limpo SEM BOM
const buffer = Buffer.from(html, 'utf8');
fs.writeFileSync('frontend/disparo/public/index.html', buffer);

console.log('\n📁 Arquivo salvo com UTF-8 limpo!');
