const { execSync } = require('child_process');

console.log('📦 Instalando dependências do frontend...\n');

try {
  execSync('npm install', { 
    cwd: __dirname,
    encoding: 'utf-8',
    stdio: 'inherit'
  });
  
  console.log('\n✅ Dependências instaladas com sucesso!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Erro na instalação:', error.message);
  process.exit(1);
}
