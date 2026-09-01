const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'index.html');
const content = fs.readFileSync(filePath, 'utf8');

console.log('=== VERIFICANDO CONTEÚDO LOCAL ===\n');

// Title
const title = content.match(/<title>([^<]+)<\/title>/);
console.log('TITLE:', title ? title[1] : 'NOT FOUND');

// Header span (emoji lua)
const headerSpan = content.match(/<span style="font-size:20px">([^<]+)<\/span>/);
console.log('HEADER SPAN:', headerSpan ? headerSpan[1] : 'NOT FOUND');

// Primeiro botão
const firstBtn = content.match(/<!-- Bot.*?es -->[\s\S]*?<button[^>]*>([^<]+)/);
console.log('PRIMEIRO BOTÃO:', firstBtn ? firstBtn[1].trim() : 'NOT FOUND');

// Segundo botão
const buttons = content.match(/<button class="tab-btn"[^>]*>([^<]+)</g);
if (buttons && buttons.length >= 2) {
  console.log('SEGUNDO BOTÃO:', buttons[1].match(/>([^<]+)/)[1].trim());
}

// Verificar se tem caracteres corrompidos
const corrupted = [
  '├®', '├│', '├ó', '├º', '├¬', '­ƒîÖ', '­ƒÆ¼', '­ƒôª', 
  '­ƒº┤', 'ÔÜá´©Å', 'Ô£ò', 'Ô£Å´©Å'
];

console.log('\n=== CARACTERES CORROMPIDOS ENCONTRADOS ===');
let found = 0;
for (const char of corrupted) {
  if (content.includes(char)) {
    console.log(`ENCONTRADO: "${char}"`);
    found++;
  }
}
if (found === 0) {
  console.log('Nenhum caractere corrompido encontrado no arquivo local!');
}

console.log('\n=== BYTES DO ARQUIVO ===');
console.log('Tamanho:', content.length, 'caracteres');
console.log('Encoding detectado: UTF-8');
