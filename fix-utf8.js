const fs = require('fs');

// Lê o arquivo como buffer
const buffer = fs.readFileSync('frontend/disparo/public/index.html');

// Converte para string UTF-8
let content = buffer.toString('utf-8');

// Lista de substituições
const replacements = [
  ['Ã"Ã‡Ã¶', '—'],
  ['ÃƒÂ—Ã¶', '—'],
  ['versâ"œÃºo', 'versão'],
  ['CatÃ¡logo', 'Catálogo'],
  ['HistÃ³rico', 'Histórico'],
  ['preÃ§o', 'preço'],
  ['descriÃ§Ã£o', 'descrição'],
  ['cÃ³digo', 'código'],
  ['nÃºmero', 'número'],
  ['imÃ¡gens', 'imagens'],
  ['ediÃ§Ã£o', 'edição'],
];

// Aplica todas as substituições
replacements.forEach(([old, new_]) => {
  content = content.split(old).join(new_);
});

// Salva como UTF-8 sem BOM
fs.writeFileSync('frontend/disparo/public/index.html', content, { encoding: 'utf-8' });

console.log('✓ Encoding corrigido!');
console.log('Title:', content.match(/<title>(.*?)<\/title>/)?.[1]);
