import { useEffect, useState } from 'react';
import { fetchMarcas } from '../api/client';
import type { Marca } from '../types';

interface BrandsIntroProps {
  onSelectBrand: (brandName: string) => void;
}

export function BrandsIntro({ onSelectBrand }: BrandsIntroProps) {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    async function loadMarcas() {
      const data = await fetchMarcas();
      setMarcas(data);
      setLoading(false);
      // Trigger reveal animation
      setTimeout(() => setRevealed(true), 100);
    }
    loadMarcas();
  }, []);

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
      {/* Hero Title */}
      <div
        className="reveal text-center mb-16"
        data-visible={revealed}
        style={{ transitionDelay: '0.1s' }}
      >
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-metal mb-6">
          Catálogo Luna
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
          Explore nossas marcas e descubra produtos de beleza exclusivos
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Carregando marcas...</span>
        </div>
      )}

      {/* Brands Grid */}
      {!loading && marcas.length > 0 && (
        <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {marcas.map((marca, index) => (
            <button
              key={marca.slug}
              onClick={() => onSelectBrand(marca.nome)}
              className="reveal surface-glass rounded-2xl p-8 transition-all duration-500 hover:scale-[1.03] hover:shadow-[0_0_80px_-12px_oklch(0.72_0.16_355_/_65%)] sheen-on-hover group"
              data-visible={revealed}
              style={{ transitionDelay: `${0.2 + index * 0.1}s` }}
            >
              <div className="flex flex-col items-center gap-4">
                {/* Brand Icon Placeholder */}
                <div className="w-20 h-20 rounded-full rose-line flex items-center justify-center text-3xl font-bold text-background">
                  {marca.nome.charAt(0).toUpperCase()}
                </div>

                {/* Brand Name */}
                <h2 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {marca.nome}
                </h2>

                {/* CTA */}
                <div className="text-sm text-muted-foreground group-hover:text-accent transition-colors">
                  Ver catálogo →
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && marcas.length === 0 && (
        <div
          className="reveal surface-glass rounded-2xl p-12 text-center max-w-md"
          data-visible={revealed}
          style={{ transitionDelay: '0.2s' }}
        >
          <div className="text-5xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Nenhuma marca encontrada
          </h3>
          <p className="text-muted-foreground">
            Não há marcas cadastradas no momento. Adicione pastas em <code className="text-accent">catalogos/</code>
          </p>
        </div>
      )}

      {/* Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-20 left-10 w-96 h-96 rounded-full bg-primary/10 blur-3xl float-slow" />
        <div
          className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-accent/10 blur-3xl float-slow"
          style={{ animationDelay: '-3.5s' }}
        />
      </div>
    </section>
  );
}
