const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'index.html');

console.log('Lendo arquivo...');
let content = fs.readFileSync(filePath, 'utf8');

// Mapeamento completo de TODOS os caracteres corrompidos que aparecem no navegador
const fixes = [
  // Emojis
  ['­ƒîÖ', '🌙'],
  ['­ƒÆ¼', '📱'],
  ['­ƒôª', '📦'],
  ['­ƒº┤', '🧴'],
  ['­ƒº¬', '📋'],
  ['­ƒôñ', '📊'],
  ['­ƒôè', '📜'],
  ['­ƒô▒', '📡'],
  ['­ƒô©', '🖼️'],
  ['­ƒöä', '🔄'],
  ['­ƒùæ´©Å', '🗑️'],
  ['­ƒÆ¥', '💾'],
  ['­ƒû╝´©Å', '🖼️'],
  ['­ƒôÁ', '📝'],
  
  // Símbolos
  ['ÔÜá´©Å', '⚠️'],
  ['Ô£ò', '✕'],
  ['Ô£Å´©Å', '✏️'],
  ['Ô£à', '✓'],
  ['ÔåÆ', '→'],
  ['ÔÅ▒´©Å', 'ℹ️'],
  ['Ô×ò', '➕'],
  
  // Acentos portugueses
  ['├®', 'é'],
  ['├¡', 'á'],
  ['├ó', 'ã'],
  ['├¡├ó', 'ão'],
  ['├│', 'ó'],
  ['├º', 'ú'],
  ['├¬', 'í'],
  ['├¬├ó', 'ção'],
  ['├¬├│es', 'ções'],
  ['├¬├ºdo', 'çúdo'],
  ['├¬├úo', 'ção'],
  ['├ó├ºde', 'aúde'],
  ['├«', 'ê'],
  ['├¬a', 'ça'],
  ['├¬├úncia', 'çância'],
  ['├¬├¡rio', 'çário'],
  ['├ª', 'â'],
  ['├º├¡vel', 'uável'],
  ['├®s', 'és'],
  ['├¬├úticas', 'cêuticas'],
  ['├¢', 'â'],
  ['├º├¡', 'uá'],
  ['├¬├Ño', 'ção'],
  ['├úo', 'ão'],
  ['├¬├º', 'çú'],
  ['├úvel', 'ável'],
  ['├¬├®', 'cê'],
  ['├║', 'ê'],
  ['├¬├│', 'ço'],
  ['├®dico', 'édico'],
  ['├¬o', 'ço'],
  ['├®ncias', 'ências'],
  ['├®ncia', 'ência'],
  ['├¬as', 'ças'],
  ['├¬├¡', 'çá'],
  ['├¬├ü', 'çã'],
  ['├¬├⌐s', 'cês'],
  ['├®sio', 'ésio'],
  ['├║ncia', 'ência'],
  ['├®ticos', 'éticos'],
  ['├®tico', 'ético'],
  ['├®ptica', 'éptica'],
  ['├®pticas', 'épticas'],
  ['├®ptico', 'éptico'],
  ['├®pticos', 'épticos'],
  ['Cosm├®ticos', 'Cosméticos'],
  ['├»', 'ç'],
  ['├⌐', 'é'],
  ['├á', 'í'],
  ['├│', 'ó'],
  ['├║', 'ú'],
  ['├ó', 'ã'],
  ['├Ñ', 'õ'],
  ['├¬', 'ç'],
  
  // Travessão
  ['ΓêÆ', '—'],
  ['Γ¢ÔÇö', '—'],
  ['ΓÇö', '—'],
  
  // Outros símbolos comuns
  ['Γ¢ï¼ï¿¢', '€'],
  ['┬░', '°'],
  ['┬¬', '¬'],
  ['┬¿', '¿'],
  ['┬º', 'º'],
  ['┬¬', 'ª'],
];

let totalFixes = 0;

console.log('Aplicando correções...');
for (const [wrong, correct] of fixes) {
  const before = content;
  content = content.split(wrong).join(correct);
  const count = (before.length - content.length) / (wrong.length - correct.length);
  if (count > 0) {
    totalFixes += count;
    console.log(`  ✓ ${wrong} → ${correct} (${count}x)`);
  }
}

console.log(`\nTotal de correções: ${totalFixes}`);
console.log('Salvando arquivo...');
fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Arquivo corrigido e salvo!');
