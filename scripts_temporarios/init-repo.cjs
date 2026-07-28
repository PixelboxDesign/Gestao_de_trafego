const { execSync } = require('child_process');

const DIR   = 'F:\\luna_cosmeticos';
const REMOTE = 'https://github.com/PixelboxDesign/Gestao_de_trafego.git';

process.chdir(DIR);

const run = (cmd) => {
  try {
    const o = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe', cwd: DIR });
    if (o && o.trim()) console.log(o.trim());
  } catch(e) {
    const m = (e.stdout||'') + (e.stderr||'');
    if (m.includes('already exists') || m.includes('already initialized') || m.includes('nothing to commit')) {
      console.log('[ok]');
    } else {
      console.error('ERR:', m.substring(0, 200));
    }
  }
};

console.log('Inicializando repositorio...');
run('git init');
run('git branch -M main');
run('git config user.email "pandboxdesign@gmail.com"');
run('git config user.name "Matheus Maia"');

// Remover remote se existir e recriar
try { execSync('git remote remove origin', { cwd: DIR, stdio: 'pipe' }); } catch(_) {}
run(`git remote add origin ${REMOTE}`);

// Criar .gitignore
const fs = require('fs');
if (!fs.existsSync('F:\\luna_cosmeticos\\.gitignore')) {
  fs.writeFileSync('F:\\luna_cosmeticos\\.gitignore',
    'node_modules/\n*.log\nlixeira/\n.env\n.env.local\n'
  );
  console.log('.gitignore criado');
}

run('git add scripts_permanentes/');
run('git add .gitignore');
run('git status --short');
run('git commit -m "feat: estrutura inicial - scripts permanentes de git"');
run('git push -u origin main');

console.log('\nRepositorio pronto!');
console.log('A partir de agora use os scripts em scripts_permanentes/');
