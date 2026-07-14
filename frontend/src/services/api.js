import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para adicionar token (se necessário no futuro)
api.interceptors.request.use(
  (config) => {
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Erro na requisição:', error);
    return Promise.reject(error);
  }
);

// Funções para clientes
export const getClientes = (params = {}) => api.get('/clientes', { params });
export const getClienteStats = () => api.get('/clientes/stats');
export const getCliente = (nome) => api.get(`/clientes/${encodeURIComponent(nome)}`);

// Funções para pedidos
export const getPedidos = (params = {}) => api.get('/pedidos', { params });
export const getPedidoStats = () => api.get('/pedidos/stats');

// Funções para tráfego
export const getTrafegoFacebook = () => api.get('/trafego/facebook');
export const getTrafegoGoogle = () => api.get('/trafego/google');
export const getTrafegoTikTok = () => api.get('/trafego/tiktok');
export const getTrafegoInstagram = () => api.get('/trafego/instagram');

// Funções para relatórios
export const getRelatorioVendas = (params = {}) => api.get('/relatorios/vendas', { params });
export const getRelatorioROI = () => api.get('/relatorios/roi');
export const getTopClientes = (limit = 10) => api.get('/relatorios/top-clientes', { params: { limit } });

export default api;
