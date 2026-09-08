import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Middleware
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API Proxy Routes
app.use('/api', async (req, res) => {
  // Remove /api prefix from req.url since API_BASE_URL already points to the full backend
  const targetUrl = `${API_BASE_URL}/api${req.url}`;
  
  console.log(`🔀 Proxying: ${req.method} ${req.url} → ${targetUrl}`);
  
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...req.headers,
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      timeout: 30000, // 30 segundos de timeout
    });

    const contentType = response.headers.get('content-type');
    
    // Forward response
    res.status(response.status);
    
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      res.json(data);
    } else if (contentType?.includes('image/')) {
      const buffer = await response.arrayBuffer();
      res.set('Content-Type', contentType);
      res.send(Buffer.from(buffer));
    } else {
      const text = await response.text();
      res.send(text);
    }
  } catch (error) {
    console.error(`[Proxy Error] ${req.method} ${req.url}:`, error.message);
    console.error(`[Proxy Error] Target URL: ${targetUrl}`);
    console.error(`[Proxy Error] Full error:`, error);
    res.status(502).json({ 
      error: 'Proxy Error', 
      message: error.message,
      target: targetUrl 
    });
  }
});

// Serve static files from dist/
app.use(express.static(join(__dirname, 'dist')));

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Luna Catálogo Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Proxying API requests to: ${API_BASE_URL}`);
  console.log(`📂 Serving static files from: ${join(__dirname, 'dist')}`);
  
  // Log da variável de ambiente para debug
  console.log(`🔍 VITE_API_BASE_URL = ${process.env.VITE_API_BASE_URL}`);
});
