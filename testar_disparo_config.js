const http = require('http');

// Testa GET
console.log('🔍 Testando GET /api/disparos/config...\n');

http.get('http://localhost:3001/api/disparos/config', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
    console.log('Parsed:', JSON.parse(data));
    console.log('\n---\n');
    
    // Se config for null, testa POST
    const config = JSON.parse(data);
    if (!config.config) {
      console.log('📝 Config é null, testando POST...\n');
      
      const postData = JSON.stringify({
        mensagem: 'Teste via script Node.js',
        item_id: 1,
        item_tipo: 'kit',
        item_nome: 'Kit Teste',
        item_thumb_url: null,
        quantidade: 10,
        intervalo_valor: 1.5,
        intervalo_unidade: 'horas'
      });
      
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/disparos/config',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log('Status POST:', res.statusCode);
          console.log('Body POST:', data);
          
          // Testa GET novamente
          console.log('\n---\n');
          console.log('🔍 Testando GET novamente...\n');
          
          http.get('http://localhost:3001/api/disparos/config', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              console.log('Status GET #2:', res.statusCode);
              console.log('Body GET #2:', data);
              console.log('Parsed GET #2:', JSON.parse(data));
            });
          });
        });
      });
      
      req.on('error', (e) => console.error('Erro POST:', e.message));
      req.write(postData);
      req.end();
    }
  });
}).on('error', (e) => console.error('Erro GET:', e.message));
