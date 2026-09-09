export interface Marca {
  nome: string;
  slug: string;
}

// API v2 - Database response
export interface Produto {
  id: number;
  produto_id: string;
  sku: string;
  nome: string;
  tipo: string;
  preco: number;
  descricao: string;
  descricao_peso: string;
  descricao_tamanho: string;
  descricao_composicao: string;
  tem_thumb: boolean;
  thumb_ext: string | null;
  imagens_carrossel: string[];
}

// Componente de kit (produto dentro do kit)
export interface Componente {
  produto_id: string;
  sku: string;
  nome: string;
  quantidade: number;
  tem_thumb: boolean;
  thumb_ext: string | null;
}

// API v2 - Database response
export interface Kit {
  id: number;
  produto_id: string;
  sku: string;
  nome: string;
  tipo: string;
  preco: number;
  descricao: string;
  eh_kit: boolean;
  tem_thumb: boolean;
  thumb_ext: string | null;
  componentes: Componente[];
}

export interface CatalogoResponse {
  marcas: Marca[];
}

export interface KitsResponse {
  marca: string;
  kits: Kit[];
}

export interface ProdutosResponse {
  marca: string;
  produtos: Produto[];
}
