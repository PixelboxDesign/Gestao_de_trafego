const fs = require('fs');

console.log('🔍 Corrigindo TODOS os caracteres UTF-8 corrompidos...\n');

let content = fs.readFileSync('frontend/disparo/public/index.html', 'utf8');

// Conta ocorrências ANTES
const beforeCount = {
  'ÔöÇÔöÇ': (content.match(/ÔöÇÔöÇ/g) || []).length,
  'ÔöÇ': (content.match(/ÔöÇ/g) || []).length,
  'versõo': (content.match(/versõo/g) || []).length,
};

console.log('ANTES:');
console.log('  - "ÔöÇÔöÇ":', beforeCount['ÔöÇÔöÇ'], 'ocorrências');
console.log('  - "ÔöÇ" (isolado):', beforeCount['ÔöÇ'] - (beforeCount['ÔöÇÔöÇ'] * 2), 'ocorrências');
console.log('  - "versõo":', beforeCount['versõo'], 'ocorrências');

// Substituições globais (ordem importa!)
const fixes = [
  // Decoradores específicos
  ['ÔöÇÔöÇ', '━━'],  // Box drawing
  ['ÔöÇ', '—'],      // Travessão em dash
  
  // Acentos comuns (double-encoding UTF-8)
  [/Ã¡/g, 'á'], [/Ã /g, 'à'], [/Ã¢/g, 'â'], [/Ã£/g, 'ã'],
  [/Ã©/g, 'é'], [/Ãª/g, 'ê'], [/Ã­/g, 'í'], [/Ã³/g, 'ó'],
  [/Ã´/g, 'ô'], [/Ãµ/g, 'õ'], [/Ãº/g, 'ú'], [/Ã§/g, 'ç'],
  [/Ã‰/g, 'É'], [/Ã"/g, 'Ó'], [/Ã/g, 'Á'],
  
  // Casos específicos
  [/versÃµo/g, 'versão'],
  [/versÃ£o/g, 'versão'],
  [/versõo/g, 'versão'],
];

let totalFixes = 0;
fixes.forEach(([pattern, replacement]) => {
  const before = content;
  if (typeof pattern === 'string') {
    const count = (content.match(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    content = content.split(pattern).join(replacement);
    if (count > 0) {
      console.log(`✓ ${pattern} → ${replacement} (${count}x)`);
      totalFixes += count;
    }
  } else {
    const matches = content.match(pattern);
    content = content.replace(pattern, replacement);
    if (matches && matches.length > 0) {
      console.log(`✓ ${pattern} → ${replacement} (${matches.length}x)`);
      totalFixes += matches.length;
    }
  }
});

// Salva com UTF-8 limpo
fs.writeFileSync('frontend/disparo/public/index.html', content, { encoding: 'utf8' });

console.log(`\n✅ Total: ${totalFixes} correções aplicadas!\n`);

// Verificação final
const after = fs.readFileSync('frontend/disparo/public/index.html', 'utf8');
const stillBroken = {
  'ÔöÇ': (after.match(/ÔöÇ/g) || []).length,
  'Ã': (after.match(/Ã[^a-zA-Z0-9\s]/g) || []).length,
};

console.log('DEPOIS:');
console.log('  - Title:', after.match(/<title>(.*?)<\/title>/)?.[1]);
console.log('  - Comentário versão:', after.match(/Force reload.*cache/)?.[0]);

if (stillBroken['ÔöÇ'] > 0 || stillBroken['Ã'] > 0) {
  console.error('\n⚠️  AVISO: Ainda há caracteres suspeitos no arquivo!');
  console.error('  - "ÔöÇ":', stillBroken['ÔöÇ']);
  console.error('  - Padrão "Ã":', stillBroken['Ã']);
} else {
  console.log('\n🎉 SUCESSO! Arquivo limpo sem caracteres corrompidos!');
}
