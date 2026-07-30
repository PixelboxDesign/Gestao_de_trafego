/**
 * git.cjs — wrapper Node.js para os scripts .bat
 * Uso: node git.cjs commit "mensagem"
 *      node git.cjs push
 *      node git.cjs commit-push "mensagem"
 *      node git.cjs pull
 *      node git.cjs amend "nova mensagem"
 *      node git.cjs status
 */
const { execSync } = require('child_process');
const path = require('path');

const DIR     = 'F:\\luna_cosmeticos';
const SCRIPTS = path.join(DIR, 'scripts_permanentes');

const acao    = process.argv[2];
const msg     = process.argv[3] || '';

if (!acao) {
  console.log('Uso: node git.cjs <acao> ["mensagem"]');
  console.log('Acoes: commit | push | commit-push | pull | amend | status');
  process.exit(1);
}

const bat = path.join(SCRIPTS, `${acao}.bat`);

try {
  const cmd = msg
    ? `cmd /c ""${bat}" "${msg}""` 
    : `cmd /c "${bat}"`;
  execSync(cmd, { cwd: DIR, stdio: 'inherit' });
} catch(e) {
  process.exit(1);
}
