const fs = require('fs');

// Lê o arquivo como está (UTF-8 mal-encodado)
let content = fs.readFileSync('frontend/disparo/public/index.html', 'utf-8');

console.log('🔍 Analisando caracteres corrompidos...');
console.log('Title antes:', content.match(/<title>(.*?)<\/title>/)?.[1]);
console.log('Comentário antes:', content.match(/\/\/ Force reload.*?cache/)?.[0]);

// Mapa completo de substituições UTF-8 corrompidos → corretos
const fixes = [
  // Travessão —
  ['ÔÇö', '—'],
  ['Ã"Ã‡Ã¶', '—'],
  ['ÃƒÂ—Ã¶', '—'],
  
  // Acentos comuns
  ['Ã¡', 'á'], ['Ã ', 'à'], ['Ã¢', 'â'], ['Ã£', 'ã'],
  ['Ã©', 'é'], ['Ãª', 'ê'], ['Ã­', 'í'], ['Ã³', 'ó'],
  ['Ã´', 'ô'], ['Ãµ', 'õ'], ['Ãº', 'ú'], ['Ã§', 'ç'],
  
  // Maiúsculas acentuadas
  ['Ã', 'Á'], ['Ã‰', 'É'], ['Ã"', 'Ó'],
  
  // Casos específicos encontrados
  ['versâ"œÃºo', 'versão'],
  ['vers├úo', 'versão'],
  ['CatÃ¡logo', 'Catálogo'],
  ['HistÃ³rico', 'Histórico'],
  ['preÃ§o', 'preço'],
  ['descriÃ§Ã£o', 'descrição'],
  ['cÃ³digo', 'código'],
  ['nÃºmero', 'número'],
  ['imÃ¡gens', 'imagens'],
  ['ediÃ§Ã£o', 'edição'],
  ['nÃºcleo', 'núcleo'],
  ['rÃ¡pido', 'rápido'],
  ['fÃ¡cil', 'fácil'],
  ['Ãºltimo', 'último'],
  ['prÃ³ximo', 'próximo'],
  ['pÃ¡gina', 'página'],
  ['tÃ­tulo', 'título'],
  ['categorÃ­a', 'categoria'],
  ['informaÃ§Ã£o', 'informação'],
  ['envÃ­o', 'envio'],
  ['quantÃ­dade', 'quantidade'],
  ['seleÃ§Ã£o', 'seleção'],
  ['exclusÃ£o', 'exclusão'],
  ['configuraÃ§Ã£o', 'configuração'],
  ['notificaÃ§Ã£o', 'notificação'],
  ['transaÃ§Ã£o', 'transação'],
  ['validaÃ§Ã£o', 'validação'],
];

// Aplica todas as correções
let fixCount = 0;
fixes.forEach(([wrong, right]) => {
  const before = content;
  content = content.split(wrong).join(right);
  if (before !== content) {
    const count = (before.match(new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    console.log(`✓ ${wrong} → ${right} (${count}x)`);
    fixCount += count;
  }
});

// Salva como UTF-8 limpo sem BOM
fs.writeFileSync('frontend/disparo/public/index.html', content, { encoding: 'utf-8' });

console.log(`\n✅ ${fixCount} correções aplicadas!`);
console.log('Title depois:', content.match(/<title>(.*?)<\/title>/)?.[1]);
console.log('Comentário depois:', content.match(/\/\/ Force reload.*?cache/)?.[0]);
