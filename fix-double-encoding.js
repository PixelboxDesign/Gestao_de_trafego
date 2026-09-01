const fs = require('fs');
const iconv = require('iconv-lite');

console.log('🔍 Lendo arquivo com double-encoding...');

// Lê como Latin1 (ISO-8859-1) para pegar os bytes crus sem interpretação
const bufferRaw = fs.readFileSync('frontend/disparo/public/index.html');
const contentLatin1 = iconv.decode(bufferRaw, 'latin1');

console.log('Antes (primeiros 500 chars):', contentLatin1.substring(1400, 1600));

// Agora trata como se fosse UTF-8 (desfaz o double-encoding)
const fixedBuffer = iconv.encode(contentLatin1, 'utf8');
const fixed = iconv.decode(fixedBuffer, 'utf8');

console.log('\nDepois (primeiros 500 chars):', fixed.substring(1400, 1600));

// Verifica se corrigiu
if (fixed.includes('ÔöÇ') || fixed.includes('Ã')) {
  console.error('\n❌ AINDA TEM CARACTERES CORROMPIDOS! Tentando abordagem diferente...');
  
  // Abordagem 2: substituição direta dos bytes corrompidos
  let content = bufferRaw.toString('utf8');
  
  const fixes = [
    // Travessão — (E2 80 94)
    ['ÔöÇ', '—'],
    ['Ã"Ã¶Ã‡', '—'],
    
    // Substitui TODOS os padrões comuns de double-encoding
    [/Ã¡/g, 'á'], [/Ã /g, 'à'], [/Ã¢/g, 'â'], [/Ã£/g, 'ã'],
    [/Ã©/g, 'é'], [/Ãª/g, 'ê'], [/Ã­/g, 'í'], [/Ã³/g, 'ó'],
    [/Ã´/g, 'ô'], [/Ãµ/g, 'õ'], [/Ãº/g, 'ú'], [/Ã§/g, 'ç'],
    [/Ã‰/g, 'É'], [/Ã"/g, 'Ó'], [/Ã/g, 'Á'],
  ];
  
  fixes.forEach(([wrong, right]) => {
    const before = content.length;
    content = content.replace(wrong, right);
    const after = content.length;
    if (before !== after) {
      console.log(`✓ Substituiu: ${wrong} → ${right}`);
    }
  });
  
  fs.writeFileSync('frontend/disparo/public/index.html', content, 'utf8');
  console.log('\n✅ Arquivo reescrito com UTF-8 correto!');
  
} else {
  // Se a conversão funcionou, salva
  fs.writeFileSync('frontend/disparo/public/index.html', fixed, 'utf8');
  console.log('\n✅ Double-encoding corrigido!');
}

// Verifica o resultado
const verificacao = fs.readFileSync('frontend/disparo/public/index.html', 'utf8');
const temErros = verificacao.includes('ÔöÇ') || verificacao.includes('Ã"Ã') || verificacao.includes('vers├ú');

if (temErros) {
  console.error('\n❌ AINDA TEM ERROS! Mostrando amostras:');
  const matches = verificacao.match(/.{0,30}[ÔÃ].{0,30}/g);
  if (matches) matches.slice(0, 5).forEach(m => console.log('  -', m));
} else {
  console.log('\n✅ VERIFICAÇÃO OK! Sem caracteres corrompidos detectados.');
  console.log('Title:', verificacao.match(/<title>(.*?)<\/title>/)?.[1]);
}
