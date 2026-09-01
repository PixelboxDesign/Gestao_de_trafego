const https = require('https');
const fs = require('fs');

console.log('🔄 Baixando HTML do servidor...');

https.get('https://luna-disparo.onrender.com', (res) => {
  let html = '';
  
  res.setEncoding('utf8');
  res.on('data', (chunk) => { html += chunk; });
  res.on('end', () => {
    // Salva como UTF-8 limpo
    fs.writeFileSync('frontend/disparo/public/index.html', html, 'utf8');
    
    console.log('\n✅ Arquivo salvo!');
    console.log('Title:', html.match(/<title>(.*?)<\/title>/)?.[1]);
    console.log('Luna Cosm:', html.match(/Luna Cosm[^\s]{0,15}/)?.[0]);
    console.log('Tem ├® (corrompido)?:', html.includes('├®') ? 'SIM' : 'NÃO');
    console.log('Tem — (correto)?:', html.includes('—') ? 'SIM' : 'NÃO');
  });
}).on('error', (err) => {
  console.error('❌ Erro:', err);
});
