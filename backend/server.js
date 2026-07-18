import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

import clientesRouter      from './routes/clientes.js';
import todosClientesRouter from './routes/todos-clientes.js';
import pedidosRouter       from './routes/pedidos.js';
import trafegoRouter       from './routes/trafego.js';
import relatoriosRouter    from './routes/relatorios.js';

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));

// ── Middleware de log de requisições → Supervisor ─────────────────────────────
app.use((req, _res, next) => {
  const start = Date.now();
  _res.on('finish', () => {
    const duration = Date.now() - start;
    const level    = _res.statusCode >= 500 ? 'error'
                   : _res.statusCode >= 400 ? 'warn'
                   : 'info';
    logger[level]('http', `${req.method} ${req.path} → ${_res.statusCode}`, {
      method: req.method, path: req.path,
      status: _res.statusCode, duration,
      ip: req.ip,
    });
  });
  next();
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: { host: process.env.DB_HOST, name: process.env.DB_NAME },
  });
});

// ── Rotas ─────────────────────────────────────────────────────────────────────
app.use('/api/clientes',       clientesRouter);
app.use('/api/todos-clientes', todosClientesRouter);
app.use('/api/pedidos',        pedidosRouter);
app.use('/api/trafego',        trafegoRouter);
app.use('/api/relatorios',     relatoriosRouter);

app.get('/', (_req, res) => {
  res.json({ name: 'API Gestão de Tráfego - Luna Cosméticos', version: '2.0.0', status: 'online' });
});

app.use((req, res) => {
  logger.warn('http', `404 — ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Rota não encontrada', path: req.path });
});

app.use((err, _req, res, _next) => {
  logger.error('http', `500 — ${err.message}`, { stack: err.stack });
  res.status(err.status || 500).json({ error: err.message || 'Erro interno do servidor' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info('server', `Backend rodando na porta ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  logger.info('server', `DB: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
});

process.on('SIGTERM', () => { logger.info('server', 'SIGTERM — encerrando'); process.exit(0); });
process.on('SIGINT',  () => { logger.info('server', 'SIGINT — encerrando');  process.exit(0); });
