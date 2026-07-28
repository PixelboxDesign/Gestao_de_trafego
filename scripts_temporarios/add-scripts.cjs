const { execSync } = require('child_process');
const DIR = 'F:\\luna_cosmeticos';
process.chdir(DIR);

const run = (cmd) => {
  try {
    const o = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe', cwd: DIR });
    if (o && o.trim()) console.log(o.trim());
  } catch(e) {
    const m = (e.stdout||'') + (e.stderr||'');
    if (!m.includes('nothing to commit') && !m.includes('up to date')) console.error('ERR:', m.substring(0,200));
    else console.log('[ok]');
  }
};

run('git add scripts_permanentes/');
run('git add scripts_temporarios/');
run('git status --short');
run('git commit -m "feat: adicionar scripts permanentes (commit, push, pull, amend, status) e temporarios"');
run('git push origin main');
console.log('\nPronto!');
