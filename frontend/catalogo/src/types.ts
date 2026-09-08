export interface Marca {
  nome: string;
  slug: string;
}

export interface Produto {
  nome: string;
  slug: string;
  marca: string;
  thumbnail?: string;
  carrossel: string[];
  categoria?: string;
}

export interface Kit {
  nome: string;
  slug: string;
  marca: string;
  thumbnail?: string;
  carrossel: string[];
  produtos: Produto[];
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
