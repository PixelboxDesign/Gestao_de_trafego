/**
 * Logger ESM — Luna Cosméticos
 * Envia logs ao Supervisor local (porta 4500) e imprime no console.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const http = require('http');

const ENABLED = process.env.SUPERVISOR_ENABLED !== 'false';

function sendToSupervisor(entries) {
  if (!ENABLED) return;
  try {
    const body = JSON.stringify(entries);
    const req  = http.request({
      hostname: 'localhost', port: 4500, path: '/ingest', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    });
    req.on('error', () => {}); // silencioso se supervisor offline
    req.write(body);
    req.end();
  } catch(_) {}
}

const COLORS = { error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[36m', debug: '\x1b[90m' };
const RESET  = '\x1b[0m';

export function log(level, module, message, meta = null) {
  const entry = {
    id:        `${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    timestamp: new Date().toISOString(),
    level, source: 'backend', module: module || '', message: String(message), meta: meta || null,
  };
  const c = COLORS[level] || '';
  console.log(`${entry.timestamp.slice(11,19)} ${c}[${level.toUpperCase()}]${RESET}${module ? ` [${module}]` : ''} ${message}`);
  sendToSupervisor([entry]);
}

export const logger = {
  info:  (mod, msg, meta) => log('info',  mod, msg, meta),
  warn:  (mod, msg, meta) => log('warn',  mod, msg, meta),
  error: (mod, msg, meta) => log('error', mod, msg, meta),
  debug: (mod, msg, meta) => log('debug', mod, msg, meta),
};

export default logger;
