import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '.env') });

// Importar rotas
import clientesRouter from './routes/clientes.js';
import pedidosRouter from './routes/pedidos.js';
import trafegoRouter from './routes/trafego.js';
import relatoriosRouter from './routes/relatorios.js';

// Criar aplicação Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globais
app.use(helmet()); // Segurança headers HTTP
app.use(compression()); // Compressão gzip
app.use(morgan('combined')); // Logs de requisições
app.use(express.json()); // Parse JSON body
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded body

// CORS configurado
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rota raiz - Página inicial da API
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API Luna Cosméticos - Gestão de Tráfego',
    version: '1.0.0',
    status: 'online',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      clientes: '/api/clientes',
      pedidos: '/api/pedidos',
      trafego: '/api/trafego',
      relatorios: '/api/relatorios'
    },
    documentation: 'https://github.com/PixelboxDesign/Gestao_de_trafego'
  });
});

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      host: process.env.DB_HOST,
      name: process.env.DB_NAME,
      connected: true
    }
  });
});

// Rotas da API
app.use('/api/clientes', clientesRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/trafego', trafegoRouter);
app.use('/api/relatorios', relatoriosRouter);

// Rota 404
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada',
    path: req.path,
    method: req.method
  });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('❌ Erro:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 Servidor Backend - Gestão de Tráfego Luna Cosméticos');
  console.log('='.repeat(60));
  console.log(`📡 Rodando em: http://localhost:${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`💾 Banco de Dados: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
  console.log('='.repeat(60));
  console.log('');
  console.log('📋 Rotas disponíveis:');
  console.log(`   GET  /health`);
  console.log(`   GET  /api/clientes`);
  console.log(`   GET  /api/pedidos`);
  console.log(`   GET  /api/trafego/*`);
  console.log(`   GET  /api/relatorios/*`);
  console.log('');
  console.log('✅ Servidor pronto para receber requisições!');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM recebido, encerrando servidor gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⚠️ SIGINT recebido, encerrando servidor...');
  process.exit(0);
});
