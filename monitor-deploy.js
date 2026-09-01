const https = require('https');

const SERVICE_ID = 'srv-d9roha7avr4c739pliu0';
const API_KEY = 'rnd_cyHZHxdwg0Aah04WKhrTYwzXSIuT';

function checkDeploy() {
  const options = {
    hostname: 'api.render.com',
    path: `/v1/services/${SERVICE_ID}/deploys?limit=1`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Accept': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Status ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function monitor() {
  console.log('🔍 Monitorando deploy no Render...\n');
  console.log(`Service: ${SERVICE_ID}`);
  console.log(`Commit esperado: 48004c4\n`);

  let lastStatus = null;
  let checkCount = 0;
  const maxChecks = 60; // 5 minutos (60 * 5s)

  const interval = setInterval(async () => {
    try {
      checkCount++;
      const response = await checkDeploy();
      
      if (response && response[0]) {
        const deploy = response[0].deploy;
        const status = deploy.status;
        const commit = deploy.commit?.id?.substring(0, 7) || 'unknown';
        
        if (status !== lastStatus) {
          const timestamp = new Date().toLocaleTimeString('pt-BR');
          console.log(`[${timestamp}] Status: ${status} | Commit: ${commit}`);
          lastStatus = status;
        }

        if (status === 'live') {
          if (commit === '48004c4') {
            console.log('\n✅ DEPLOY CONCLUÍDO COM SUCESSO!');
            console.log('🌐 Site: https://luna-disparo.onrender.com');
            console.log('\n⚠️  IMPORTANTE: Limpe o cache do navegador:');
            console.log('   1. Ctrl + Shift + Delete');
            console.log('   2. Selecione "Imagens e arquivos em cache"');
            console.log('   3. Clique em "Limpar dados"');
            console.log('   4. Recarregue a página com Ctrl + Shift + R');
            clearInterval(interval);
          } else {
            console.log(`⚠️  Deploy live mas ainda é commit antigo: ${commit}`);
          }
        } else if (status === 'build_failed' || status === 'upload_failed') {
          console.log(`\n❌ DEPLOY FALHOU: ${status}`);
          clearInterval(interval);
        }
      }

      if (checkCount >= maxChecks) {
        console.log('\n⏱️  Tempo limite atingido (5 minutos)');
        clearInterval(interval);
      }
    } catch (error) {
      console.error('Erro ao verificar deploy:', error.message);
    }
  }, 5000); // Verifica a cada 5 segundos
}

monitor();
