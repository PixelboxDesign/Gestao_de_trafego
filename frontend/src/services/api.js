import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: BASE,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.message || err.response?.data?.error || err.message;
    console.error(`[API ${err.config?.url}] ${err.response?.status || 'NETWORK'}: ${msg}`);
    return Promise.reject(err);
  }
);

// Clientes
export const getClientes      = (params = {}) => api.get('/clientes', { params });
export const getClienteStats  = ()             => api.get('/clientes/stats');
export const getTodosClientes = ()             => api.get('/todos-clientes');

// Pedidos
export const getPedidos      = (params = {}) => api.get('/pedidos', { params });
export const getPedidoStats  = ()             => api.get('/pedidos/stats');

// Tráfego
export const getTrafegoFacebook  = () => api.get('/trafego/facebook');
export const getTrafegoInstagram = () => api.get('/trafego/instagram');
export const getTrafegoGoogle    = () => api.get('/trafego/google');
export const getTrafegoTikTok    = () => api.get('/trafego/tiktok');

// Relatórios
export const getRelatorioVendas  = (params = {}) => api.get('/relatorios/vendas', { params });
export const getRelatorioROI     = ()             => api.get('/relatorios/roi');
export const getTopClientes      = (limit = 10)   => api.get('/relatorios/top-clientes', { params: { limit } });

export default api;
