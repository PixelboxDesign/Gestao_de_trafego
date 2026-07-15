const { execSync } = require('child_process');

console.log('🔨 Testando build do frontend...\n');

try {
  const output = execSync('npm run build', { 
    cwd: __dirname,
    encoding: 'utf-8',
    stdio: 'inherit'
  });
  
  console.log('\n✅ Build concluído com sucesso!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Erro no build:', error.message);
  process.exit(1);
}
