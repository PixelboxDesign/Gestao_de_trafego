# 📊 Gestão de Tráfego - Luna Cosméticos

Sistema web full stack para análise de clientes e suporte a decisões de marketing digital. Backend Node.js + Express, frontend React, conectado ao MySQL histórico.

## 🏗️ Arquitetura

```
gestao-trafego-luna/
├── backend/                 # API REST (Node.js + Express)
│   ├── server.js           # Servidor principal
│   ├── config/             # Configurações (DB, etc)
│   ├── routes/             # Rotas da API
│   ├── controllers/        # Lógica de negócio
│   ├── models/             # Modelos de dados
│   └── middleware/         # Middlewares (auth, cors, etc)
│
├── frontend/               # Interface React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── pages/         # Páginas/views
│   │   ├── services/      # Chamadas API
│   │   ├── utils/         # Funções auxiliares
│   │   └── App.jsx        # Componente raiz
│   ├── index.html
│   └── package.json
│
├── .env.example           # Exemplo de variáveis de ambiente
├── package.json           # Dependências do projeto
└── README.md             # Este arquivo
```

## 🚀 Como Rodar Localmente

### Pré-requisitos
- Node.js 18+
- MySQL rodando localmente
- Git

### 1. Clone o repositório
```bash
git clone https://github.com/PandboxDesign/Gastao-de-trafego.git
cd Gastao-de-trafego
```

### 2. Configure as variáveis de ambiente
```bash
cp .env.example .env
# Edite .env com suas credenciais
```

### 3. Instale as dependências
```bash
# Backend
npm install

# Frontend
cd frontend
npm install
cd ..
```

### 4. Execute em modo desenvolvimento
```bash
# Backend + Frontend simultaneamente
npm run dev

# Ou separadamente:
npm run dev:backend  # Backend em http://localhost:3000
npm run dev:frontend # Frontend em http://localhost:5173
```

## 🌐 Deploy no Render

### Backend (Web Service)

1. **Criar novo Web Service no Render**
2. **Conectar ao GitHub:** `PandboxDesign/Gastao-de-trafego`
3. **Configurações:**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: `Node`

4. **Variáveis de Ambiente:**
   ```
   NODE_ENV=production
   PORT=10000
   DB_HOST=seu-host-mysql
   DB_PORT=3306
   DB_USER=seu-usuario
   DB_PASSWORD=sua-senha
   DB_NAME=historico_alphahall
   FRONTEND_URL=https://seu-frontend.onrender.com
   ```

### Frontend (Static Site)

1. **Criar novo Static Site no Render**
2. **Conectar ao GitHub:** `PandboxDesign/Gastao-de-trafego`
3. **Configurações:**
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/dist`

4. **Variáveis de Ambiente:**
   ```
   VITE_API_URL=https://seu-backend.onrender.com/api
   ```

## 📡 API Endpoints

### Clientes
- `GET /api/clientes` - Lista todos os clientes
- `GET /api/clientes/:id` - Detalhes de um cliente
- `GET /api/clientes/stats` - Estatísticas de clientes

### Pedidos
- `GET /api/pedidos` - Lista pedidos
- `GET /api/pedidos/:id` - Detalhes de um pedido
- `GET /api/pedidos/stats` - Estatísticas de pedidos

### Tráfego
- `GET /api/trafego/facebook` - Dados do Facebook Ads
- `GET /api/trafego/google` - Dados do Google Ads
- `GET /api/trafego/tiktok` - Dados do TikTok Ads

### Relatórios
- `GET /api/relatorios/vendas` - Relatório de vendas
- `GET /api/relatorios/roi` - ROI de campanhas

## 🛠️ Tecnologias

**Backend:**
- Node.js 18+
- Express.js 4.18
- MySQL2 (promise-based)
- Helmet (security)
- CORS
- Morgan (logging)

**Frontend:**
- React 18
- Vite 5
- React Router 6
- Axios
- Chart.js
- Lucide Icons

## 📝 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Backend
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=1728f1br
DB_NAME=historico_alphahall

# Frontend URL (para CORS)
FRONTEND_URL=http://localhost:5173

# API URL (usado pelo frontend)
VITE_API_URL=http://localhost:3000/api
```

## 🔐 Segurança

- Helmet.js para headers de segurança
- CORS configurado apenas para frontend autorizado
- Sanitização de inputs
- Prepared statements no MySQL (proteção SQL injection)
- Rate limiting em endpoints sensíveis

## 📦 Scripts Disponíveis

```bash
npm run dev              # Backend + Frontend (desenvolvimento)
npm run dev:backend      # Apenas backend
npm run dev:frontend     # Apenas frontend
npm run build:frontend   # Build de produção do frontend
npm start               # Inicia backend em produção
```

## 🐛 Debug

### Backend não conecta ao banco
- Verifique credenciais em `.env`
- Confirme que MySQL está rodando
- Teste conexão: `mysql -u root -p1728f1br -h localhost`

### Frontend não carrega dados
- Verifique se backend está rodando
- Confirme `VITE_API_URL` no `.env` do frontend
- Abra DevTools e veja console para erros

### CORS Error
- Verifique `FRONTEND_URL` no `.env` do backend
- Confirme que frontend está acessando a URL correta

## 📄 Licença

ISC

## 👤 Autor

**Matheus Maia**
- GitHub: [@PandboxDesign](https://github.com/PandboxDesign)

---

**Status do Projeto:** ✅ Ativo | 🚀 Em Desenvolvimento
