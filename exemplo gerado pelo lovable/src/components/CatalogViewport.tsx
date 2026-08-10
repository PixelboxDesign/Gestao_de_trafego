import { useMemo, useState } from "react";
import { Reveal } from "./Reveal";
import { categories, products } from "@/data/catalog";
import { cn } from "@/lib/utils";

export function CatalogViewport({ onBack }: { onBack: () => void }) {
  const [category, setCategory] = useState("Todos");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const list = useMemo(
    () => (category === "Todos" ? products : products.filter((p) => p.category === category)),
    [category],
  );
  const count = Object.values(selected).filter(Boolean).length;

  return (
    <section className="mx-auto w-full max-w-7xl px-6 pb-28 pt-10">
      <Reveal as="header" className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <button
            onClick={onBack}
            className="text-xs uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-primary"
          >
            ← marcas
          </button>
          <h2 className="mt-4 text-4xl font-extrabold sm:text-5xl">
            <span className="text-metal">Catálogo de produtos</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {list.length} itens · selecione os produtos desejados
          </p>
        </div>
        <div
          className={cn(
            "surface-glass rounded-full px-5 py-3 text-sm transition-all duration-500",
            count > 0 ? "opacity-100 shadow-[var(--glow-rose)]" : "opacity-60",
          )}
        >
          <span className="font-semibold text-primary">{count}</span> selecionado
          {count === 1 ? "" : "s"}
        </div>
      </Reveal>

      <Reveal delay={120} className="mt-10 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-5 py-2 text-xs uppercase tracking-widest transition-all duration-400",
              category === c
                ? "border-transparent text-primary-foreground rose-line"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </Reveal>

      <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((p, i) => {
          const isOn = !!selected[p.id];
          return (
            <Reveal as="li" key={p.id} delay={(i % 4) * 80}>
              <article
                className={cn(
                  "surface-glass group relative h-full overflow-hidden rounded-3xl p-4 transition-all duration-500",
                  "hover:-translate-y-2 hover:shadow-[var(--glow-rose)]",
                  isOn && "border-primary/70 shadow-[var(--glow-rose)]",
                )}
              >
                <label className="absolute right-6 top-6 z-10 cursor-pointer">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={isOn}
                    onChange={(e) =>
                      setSelected((s) => ({ ...s, [p.id]: e.target.checked }))
                    }
                    aria-label={`Selecionar ${p.name}`}
                  />
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background/70 text-transparent",
                      "transition-all duration-400 peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                      isOn && "scale-110 border-transparent text-primary-foreground rose-line",
                    )}
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </label>

                <div className="sheen-on-hover aspect-square w-full overflow-hidden rounded-2xl bg-white transition-transform duration-700 group-hover:scale-[1.02]" />

                <div className="px-2 pb-1 pt-5">
                  <p className="text-[0.65rem] uppercase tracking-[0.25em] text-primary">{p.brand}</p>
                  <h3 className="mt-2 text-base leading-snug font-bold">{p.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.category} · {p.volume}
                  </p>
                  <p className="mt-4 text-lg font-semibold text-metal">{p.price}</p>
                </div>
              </article>
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}