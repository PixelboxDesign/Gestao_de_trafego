export type Brand = {
  id: string;
  name: string;
  tagline: string;
  linhas: string;
};

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  volume: string;
  price: string;
};

export const brands: Brand[] = [
  { id: "aurea", name: "Áurea", tagline: "Nutrição profunda com óleos raros", linhas: "4 linhas" },
  { id: "veluto", name: "Velutto", tagline: "Reconstrução para fios danificados", linhas: "3 linhas" },
  { id: "orquidea", name: "Orquídea", tagline: "Hidratação leve para uso diário", linhas: "5 linhas" },
  { id: "noir", name: "Noir Hair", tagline: "Coloração e proteção de cor", linhas: "6 linhas" },
  { id: "seda-viva", name: "Seda Viva", tagline: "Alisamento e controle de frizz", linhas: "3 linhas" },
  { id: "botanik", name: "Botanik", tagline: "Fórmulas veganas e naturais", linhas: "4 linhas" },
];

export const products: Product[] = [
  { id: "p1", name: "Shampoo Reconstrutor Intenso", brand: "Velutto", category: "Shampoo", volume: "300 ml", price: "R$ 89,90" },
  { id: "p2", name: "Condicionador Nutrição Áurea", brand: "Áurea", category: "Condicionador", volume: "300 ml", price: "R$ 94,90" },
  { id: "p3", name: "Máscara Capilar Ouro Rosa", brand: "Áurea", category: "Tratamento", volume: "500 g", price: "R$ 149,90" },
  { id: "p4", name: "Leave-in Multifuncional", brand: "Orquídea", category: "Finalizador", volume: "200 ml", price: "R$ 69,90" },
  { id: "p5", name: "Óleo Reparador de Pontas", brand: "Botanik", category: "Óleo", volume: "60 ml", price: "R$ 79,90" },
  { id: "p6", name: "Sérum Antifrizz Sedoso", brand: "Seda Viva", category: "Finalizador", volume: "100 ml", price: "R$ 84,90" },
  { id: "p7", name: "Shampoo Matizador Platinum", brand: "Noir Hair", category: "Shampoo", volume: "250 ml", price: "R$ 99,90" },
  { id: "p8", name: "Ampola de Choque Proteico", brand: "Velutto", category: "Tratamento", volume: "15 ml", price: "R$ 29,90" },
  { id: "p9", name: "Creme de Pentear Hidratante", brand: "Orquídea", category: "Finalizador", volume: "400 ml", price: "R$ 74,90" },
  { id: "p10", name: "Protetor Térmico Blindagem", brand: "Seda Viva", category: "Proteção", volume: "150 ml", price: "R$ 88,90" },
  { id: "p11", name: "Tônico Fortalecedor Botanik", brand: "Botanik", category: "Tratamento", volume: "120 ml", price: "R$ 109,90" },
  { id: "p12", name: "Máscara Matizadora Noir", brand: "Noir Hair", category: "Tratamento", volume: "300 g", price: "R$ 119,90" },
  { id: "p13", name: "Kit Reconstrução Completa", brand: "Velutto", category: "Kits", volume: "3 itens", price: "R$ 249,90" },
  { id: "p14", name: "Kit Hidratação Diária", brand: "Orquídea", category: "Kits", volume: "2 itens", price: "R$ 169,90" },
  { id: "p15", name: "Kit Blindagem Térmica", brand: "Seda Viva", category: "Kits", volume: "3 itens", price: "R$ 229,90" },
  { id: "p16", name: "Kit Loiras Platinum", brand: "Noir Hair", category: "Kits", volume: "2 itens", price: "R$ 199,90" },
];

export const categories = ["Todos", "Kits", "Shampoo", "Condicionador", "Tratamento", "Finalizador", "Óleo", "Proteção"];