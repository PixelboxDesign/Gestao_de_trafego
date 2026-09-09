import type { Marca, Kit, Produto } from '../types';

// Sempre usa /api relativo - o server.js faz o proxy para o backend
// Build timestamp: 2026-09-08T23:40:00Z
const API_BASE = '/api';

/**
 * Busca lista de marcas disponíveis (nomes das pastas em catalogos/)
 */
export async function fetchMarcas(): Promise<Marca[]> {
  console.log('[API] Iniciando fetchMarcas...');
  console.log('[API] API_BASE =', API_BASE);
  console.log('[API] URL completa:', `${API_BASE}/catalogo/marcas`);
  
  try {
    const url = `${API_BASE}/catalogo/marcas`;
    console.log('[API] Fazendo fetch para:', url);
    
    const response = await fetch(url);
    console.log('[API] Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log('[API] Dados recebidos:', data);
    
    // Backend retorna array diretamente, não { marcas: [...] }
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[API] Erro ao buscar marcas:', error);
    return [];
  }
}

/**
 * Busca kits de uma marca específica (API v2 - Database)
 */
export async function fetchKits(marca: string): Promise<Kit[]> {
  try {
    const response = await fetch(`${API_BASE}/catalogo/v2/kits`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    // Backend retorna array diretamente
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`[API] Erro ao buscar kits:`, error);
    return [];
  }
}

/**
 * Busca produtos individuais de uma marca específica (API v2 - Database)
 */
export async function fetchProdutos(marca: string): Promise<Produto[]> {
  try {
    const response = await fetch(`${API_BASE}/catalogo/v2/produtos-individuais`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    // Backend retorna array diretamente
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`[API] Erro ao buscar produtos:`, error);
    return [];
  }
}

/**
 * Retorna URL completa para uma imagem do catálogo
 * @param marca Nome da marca (ex: "Alphahall")
 * @param tipo Tipo de produto ('kit' ou 'produto')
 * @param nome Nome do produto/kit do banco de dados
 * @param filename Nome do arquivo (ex: "thumb.jpg", "img_1.jpg")
 */
export function getImageUrl(marca: string, tipo: 'kit' | 'produto', nome: string, filename: string): string {
  // Limpa o nome para usar como pasta (mesmo tratamento do backend)
  const nomePasta = nome.replace(/[<>:"/\\|?*]/g, '').trim();
  return `${API_BASE}/catalogo/imagem/${encodeURIComponent(marca)}/${encodeURIComponent(nomePasta)}/${encodeURIComponent(filename)}?tipo=${tipo}`;
}
