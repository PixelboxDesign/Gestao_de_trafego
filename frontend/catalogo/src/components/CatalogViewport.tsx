import { useEffect, useState } from 'react';
import { fetchKits, fetchProdutos } from '../api/client';
import { ProductCard } from './ProductCard';
import type { Kit, Produto } from '../types';

interface CatalogViewportProps {
  brandName: string;
  onBack: () => void;
}

type Tab = 'kits' | 'produtos';

export function CatalogViewport({ brandName, onBack }: CatalogViewportProps) {
  const [activeTab, setActiveTab] = useState<Tab>('kits');
  const [kits, setKits] = useState<Kit[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    async function loadCatalogo() {
      setLoading(true);
      const [kitsData, produtosData] = await Promise.all([
        fetchKits(brandName),
        fetchProdutos(brandName),
      ]);
      setKits(kitsData);
      setProdutos(produtosData);
      setLoading(false);
      setTimeout(() => setRevealed(true), 100);
    }
    loadCatalogo();
  }, [brandName]);

  const currentItems = activeTab === 'kits' ? kits : produtos;

  return (
    <section className="min-h-screen px-6 py-12">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          <span>Voltar para marcas</span>
        </button>

        <div
          className="reveal"
          data-visible={revealed}
          style={{ transitionDelay: '0.1s' }}
        >
          <h1 className="text-5xl md:text-6xl font-bold text-metal mb-4">
            {brandName}
          </h1>
          <p className="text-xl text-muted-foreground">
            Explore {activeTab === 'kits' ? 'kits completos' : 'produtos individuais'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto mb-12">
        <div
          className="reveal flex gap-2 p-1.5 surface-glass rounded-2xl w-fit"
          data-visible={revealed}
          style={{ transitionDelay: '0.2s' }}
        >
          <button
            onClick={() => setActiveTab('kits')}
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === 'kits'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Kits
            {kits.length > 0 && (
              <span className="ml-2 text-sm opacity-75">({kits.length})</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('produtos')}
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === 'produtos'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Produtos
            {produtos.length > 0 && (
              <span className="ml-2 text-sm opacity-75">({produtos.length})</span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {loading && (
          <div className="flex items-center justify-center gap-3 text-muted-foreground py-20">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Carregando catálogo...</span>
          </div>
        )}

        {!loading && currentItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentItems.map((item, index) => (
              <ProductCard
                key={item.slug}
                item={item}
                brandName={brandName}
                tipo={activeTab}
                revealed={revealed}
                index={index}
              />
            ))}
          </div>
        )}

        {!loading && currentItems.length === 0 && (
          <div
            className="reveal surface-glass rounded-2xl p-12 text-center max-w-md mx-auto"
            data-visible={revealed}
            style={{ transitionDelay: '0.3s' }}
          >
            <div className="text-5xl mb-4">
              {activeTab === 'kits' ? '📦' : '✨'}
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Nenhum {activeTab === 'kits' ? 'kit' : 'produto'} encontrado
            </h3>
            <p className="text-muted-foreground">
              Não há {activeTab === 'kits' ? 'kits' : 'produtos'} cadastrados para esta marca.
            </p>
          </div>
        )}
      </div>

      {/* Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-40 right-20 w-96 h-96 rounded-full bg-accent/10 blur-3xl float-slow" />
        <div
          className="absolute bottom-40 left-20 w-96 h-96 rounded-full bg-primary/10 blur-3xl float-slow"
          style={{ animationDelay: '-3.5s' }}
        />
      </div>
    </section>
  );
}
