const { execSync } = require('child_process');

console.log('\n=== FAZENDO COMMIT E PUSH ===\n');

try {
  // Add all files
  console.log('📦 git add .');
  execSync('git add .', { stdio: 'inherit', cwd: 'f:/luna_cosmeticos/trafego_luna_cosmeticos' });
  
  // Commit
  console.log('\n💾 git commit...');
  execSync('git commit -m "fix: corrigir queries SQL com colunas reais do banco"', { 
    stdio: 'inherit', 
    cwd: 'f:/luna_cosmeticos/trafego_luna_cosmeticos' 
  });
  
  // Push
  console.log('\n🚀 git push origin main...');
  execSync('git push origin main', { stdio: 'inherit', cwd: 'f:/luna_cosmeticos/trafego_luna_cosmeticos' });
  
  console.log('\n✅ PUSH CONCLUÍDO COM SUCESSO!\n');
  
} catch (error) {
  console.error('\n❌ Erro:', error.message);
  process.exit(1);
}
