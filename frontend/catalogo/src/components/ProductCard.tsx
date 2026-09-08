import { useState } from 'react';
import { getImageUrl } from '../api/client';
import type { Kit, Produto } from '../types';

interface ProductCardProps {
  item: Kit | Produto;
  brandName: string;
  tipo: 'kits' | 'produtos';
  revealed: boolean;
  index: number;
}

export function ProductCard({ item, brandName, tipo, revealed, index }: ProductCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const images = item.carrossel || [];
  const hasMultipleImages = images.length > 1;
  const currentImage = images[currentImageIndex];

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setImageError(false);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setImageError(false);
  };

  const thumbnailUrl = item.thumbnail
    ? getImageUrl(brandName, tipo, item.slug, item.thumbnail)
    : currentImage
    ? getImageUrl(brandName, tipo, item.slug, currentImage)
    : null;

  return (
    <div
      className="reveal surface-glass rounded-2xl overflow-hidden group hover:scale-[1.02] transition-all duration-500 hover:shadow-[0_0_60px_-12px_oklch(0.72_0.16_355_/_45%)]"
      data-visible={revealed}
      style={{ transitionDelay: `${0.3 + index * 0.05}s` }}
    >
      {/* Image Container */}
      <div className="relative aspect-square bg-muted/20 overflow-hidden">
        {thumbnailUrl && !imageError ? (
          <>
            <img
              src={thumbnailUrl}
              alt={item.nome}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={() => setImageError(true)}
              loading="lazy"
            />

            {/* Carrossel Navigation */}
            {hasMultipleImages && (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-3 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button
                  onClick={handlePrevImage}
                  className="w-9 h-9 rounded-full surface-glass flex items-center justify-center hover:scale-110 transition-transform sheen-on-hover"
                  aria-label="Imagem anterior"
                >
                  <span className="text-foreground font-bold">←</span>
                </button>

                <div className="flex gap-1.5">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(idx);
                        setImageError(false);
                      }}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        idx === currentImageIndex
                          ? 'bg-primary w-6'
                          : 'bg-muted-foreground/40 hover:bg-muted-foreground/70'
                      }`}
                      aria-label={`Ir para imagem ${idx + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNextImage}
                  className="w-9 h-9 rounded-full surface-glass flex items-center justify-center hover:scale-110 transition-transform sheen-on-hover"
                  aria-label="Próxima imagem"
                >
                  <span className="text-foreground font-bold">→</span>
                </button>
              </div>
            )}

            {/* Image Counter Badge */}
            {hasMultipleImages && (
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full surface-glass text-xs font-semibold text-foreground">
                {currentImageIndex + 1}/{images.length}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl text-muted-foreground/30">
            {tipo === 'kits' ? '📦' : '✨'}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
          {item.nome}
        </h3>

        {/* Categoria Badge (se disponível) */}
        {'categoria' in item && item.categoria && (
          <span className="inline-block px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-medium">
            {item.categoria}
          </span>
        )}

        {/* Kit Info */}
        {'produtos' in item && item.produtos && item.produtos.length > 0 && (
          <div className="mt-3 text-sm text-muted-foreground">
            <span className="font-medium">{item.produtos.length}</span> produto
            {item.produtos.length !== 1 ? 's' : ''} neste kit
          </div>
        )}
      </div>
    </div>
  );
}
