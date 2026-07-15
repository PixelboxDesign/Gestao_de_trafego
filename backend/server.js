import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// .env fica na raiz do projeto (um nível acima de /backend)
dotenv.config({ path: join(__dirname, '..', '.env') });

import clientesRouter     from './routes/clientes.js';
import todosClientesRouter from './routes/todos-clientes.js';
import pedidosRouter      from './routes/pedidos.js';
import trafegoRouter      from './routes/trafego.js';
import relatoriosRouter   from './routes/relatorios.js';

const app  = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS — aceitar qualquer origem (ajustar para domínio específico em produção se necessário)
app.use(cors({ origin: true, credentials: true }));

// Health check — sem consulta ao banco para responder rápido
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: { host: process.env.DB_HOST, name: process.env.DB_NAME },
  });
});

// Rotas da API
app.use('/api/clientes',      clientesRouter);
app.use('/api/todos-clientes', todosClientesRouter);
app.use('/api/pedidos',       pedidosRouter);
app.use('/api/trafego',       trafegoRouter);
app.use('/api/relatorios',    relatoriosRouter);

// Rota raiz
app.get('/', (_req, res) => {
  res.json({
    name: 'API Gestão de Tráfego - Luna Cosméticos',
    version: '2.0.0',
    status: 'online',
    endpoints: ['/health', '/api/clientes', '/api/todos-clientes', '/api/pedidos', '/api/trafego', '/api/relatorios'],
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada', path: req.path });
});

// Error handler global
app.use((err, _req, res, _next) => {
  console.error('Erro global:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  console.log(`💾 DB: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT',  () => process.exit(0));
