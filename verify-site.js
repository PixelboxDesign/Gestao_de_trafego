const fs = require('fs');

console.log('🔍 Verificando encoding do site deployado...\n');

const html = fs.readFileSync('test-site.html', 'utf8');

console.log('✓ Title:', html.match(/<title>(.*?)<\/title>/)?.[1]);

// Procura por "versão"
const versaoMatch = html.match(/vers[aã\u00e3\u00f5]o/gi);
if (versaoMatch) {
  console.log('✓ Palavra "versão" encontrada:', versaoMatch[0]);
} else {
  console.log('⚠️  Palavra "versão" NÃO ENCONTRADA');
}

// Procura comentário Header
const headerComment = html.match(/\/\*[^\*]*Header[^\*]*\*\//);
if (headerComment) {
  console.log('✓ Comentário Header:', headerComment[0]);
}

// Procura caracteres ruins
const badPatterns = [
  'ÔöÇ',
  'Ã"Ã¶',
  'vers├ú',
  'versõo',
];

console.log('\n🔍 Procurando caracteres corrompidos...');
let foundBad = false;
badPatterns.forEach(pattern => {
  if (html.includes(pattern)) {
    console.log(`❌ ENCONTRADO: "${pattern}"`);
    foundBad = true;
  }
});

if (!foundBad) {
  console.log('✅ NENHUM caractere corrompido detectado!');
}

// Estatísticas
console.log('\n📊 Estatísticas:');
console.log('  - Tamanho:', html.length, 'caracteres');
console.log('  - Travessão "—":', (html.match(/—/g) || []).length, 'ocorrências');
console.log('  - Box drawing "━":', (html.match(/━/g) || []).length, 'ocorrências');
