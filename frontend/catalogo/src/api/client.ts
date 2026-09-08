import type { Marca, Kit, Produto } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Busca lista de marcas disponíveis (nomes das pastas em catalogos/)
 */
export async function fetchMarcas(): Promise<Marca[]> {
  try {
    const response = await fetch(`${API_BASE}/api/catalogo/marcas`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
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
    const response = await fetch(`${API_BASE}/api/catalogo/kits/${encodeURIComponent(marca)}`);
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
    const response = await fetch(`${API_BASE}/api/catalogo/produtos/${encodeURIComponent(marca)}`);
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
  return `${API_BASE}/api/catalogo/imagem/${encodeURIComponent(marca)}/${encodeURIComponent(produtoSlug)}/${encodeURIComponent(filename)}?tipo=${tipoParam}`;
}
