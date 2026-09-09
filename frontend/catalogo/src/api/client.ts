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
    return data.marcas || [];
  } catch (error) {
    console.error('[API] Erro ao buscar marcas:', error);
    return [];
  }
}

/**
 * Busca kits de uma marca específica
 */
export async function fetchKits(marca: string): Promise<Kit[]> {
  try {
    const response = await fetch(`${API_BASE}/catalogo/kits/${encodeURIComponent(marca)}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.kits || [];
  } catch (error) {
    console.error(`[API] Erro ao buscar kits da marca "${marca}":`, error);
    return [];
  }
}

/**
 * Busca produtos individuais de uma marca específica
 */
export async function fetchProdutos(marca: string): Promise<Produto[]> {
  try {
    const response = await fetch(`${API_BASE}/catalogo/produtos/${encodeURIComponent(marca)}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.produtos || [];
  } catch (error) {
    console.error(`[API] Erro ao buscar produtos da marca "${marca}":`, error);
    return [];
  }
}

/**
 * Retorna URL completa para uma imagem do catálogo
 */
export function getImageUrl(marca: string, tipo: 'kits' | 'produtos', produtoSlug: string, filename: string): string {
  // Adiciona query parameter ?tipo=produto ou ?tipo=kit
  const tipoParam = tipo === 'produtos' ? 'produto' : 'kit';
  return `${API_BASE}/catalogo/imagem/${encodeURIComponent(marca)}/${encodeURIComponent(produtoSlug)}/${encodeURIComponent(filename)}?tipo=${tipoParam}`;
}
