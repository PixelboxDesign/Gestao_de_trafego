const fs = require('fs');

console.log('🔧 CORREÇÃO DEFINITIVA DE TODOS OS CARACTERES\n');

let html = fs.readFileSync('frontend/disparo/public/index.html', 'utf8');

console.log('ANTES:');
console.log('  Title:', html.match(/<title>(.*?)<\/title>/)?.[1]);
console.log('  Header span:', html.match(/<span style="font-size:20px">([^<]+)<\/span>/)?.[1]);

// TODOS os emojis e caracteres UTF-8 corrompidos
const fixes = [
  // === EMOJIS ===
  ['­ƒîÖ', '🌙'],  // lua
  ['­ƒÆ¼', '📱'],  // celular
  ['­ƒôª', '📦'],  // caixa
  ['­ƒº┤', '🧴'],  // produto/loção
  ['­ƒôñ', '📋'],  // clipboard
  ['­ƒôè', '📊'],  // gráfico
  ['­ƒô▒', '📞'],  // telefone
  ['­ƒöä', '🔄'],  // reload
  ['­ƒº¬', '🚀'],  // foguete
  ['­ƒôÁ', '📴'],  // celular off
  ['­ƒô©', '📷'],  // câmera
  ['­ƒû╝´©Å', '🖼️'],  // frame
  ['­ƒæü´©Å', '👁️'],  // olho
  ['­ƒùæ´©Å', '🗑️'],  // lixeira
  ['­ƒÆ¥', '💾'],  // salvar
  ['­ƒÜÇ', '▶️'],  // play
  ['­ƒÄë', '🎉'],  // festa
  ['­ƒô¡', '📭'],  // caixa vazia
  
  // === SÍMBOLOS ===
  ['ÔÜá´©Å', '⚠️'],  // aviso
  ['Ô£ò', '✕'],   // x
  ['Ô£Å´©Å', '✏️'],  // lápis
  ['Ô£à', '✓'],   // check
  ['Ô£ô', '✔️'],  // check bold
  ['ÔØî', '❌'],  // x vermelho
  ['ÔåÆ', '→'],   // seta direita
  ['ÔÅ▒´©Å', 'ℹ️'],  // info
  ['Ô×ò', '➕'],  // mais
  
  // === ACENTUAÇÃO PORTUGUESA ===
  // é
  ['├®', 'é'],
  ['Ã©', 'é'],
  
  // ó  
  ['├│', 'ó'],
  ['Ã³', 'ó'],
  
  // ão
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
  ['├Áo', 'õo'],
  ['Ãµ', 'õ'],
  
  // É
  ['├ë', 'É'],
  ['Ã‰', 'É'],
  
  // Ó
  ['├ô', 'Ó'],
  ['Ã"', 'Ó'],
  
  // Á
  ['├ü', 'Á'],
  ['Ã', 'Á'],
];

let totalFixes = 0;
const found = {};

fixes.forEach(([wrong, right]) => {
  const regex = new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const matches = html.match(regex);
  if (matches && matches.length > 0) {
    console.log(`  ✓ ${wrong} → ${right} (${matches.length}x)`);
    html = html.replace(regex, right);
    totalFixes += matches.length;
    found[wrong] = matches.length;
  }
});

console.log(`\n✅ Total: ${totalFixes} correções aplicadas\n`);

// Salva com UTF-8 limpo
fs.writeFileSync('frontend/disparo/public/index.html', html, 'utf8');

console.log('DEPOIS:');
console.log('  Title:', html.match(/<title>(.*?)<\/title>/)?.[1]);
console.log('  Header span:', html.match(/<span style="font-size:20px">([^<]+)<\/span>/)?.[1]);

// Verifica se ainda tem caracteres estranhos
const suspicious = html.match(/[­Ã├Ô]/g);
if (suspicious && suspicious.length > 10) {
  console.log(`\n⚠️  Ainda há ${suspicious.length} caracteres suspeitos!`);
  console.log('Primeiros 10:', [...new Set(suspicious)].slice(0, 10));
} else {
  console.log('\n🎉 ARQUIVO LIMPO!');
}
