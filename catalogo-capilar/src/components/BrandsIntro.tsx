import { Reveal } from "./Reveal";
import { brands } from "@/data/catalog";

export function BrandsIntro({ onEnter }: { onEnter: () => void }) {
  return (
    <section className="relative mx-auto min-h-screen w-full max-w-6xl px-6 py-20">
      <div className="pointer-events-none absolute left-1/2 top-10 -z-10 h-72 w-72 -translate-x-1/2 rounded-full opacity-25 blur-3xl rose-line float-slow" />

      <Reveal as="header" className="pt-10 text-center">
        <p className="text-xs uppercase tracking-[0.45em] text-muted-foreground">Catálogo</p>
        <h1 className="mt-5 text-5xl leading-[1.05] font-extrabold sm:text-7xl">
          <span className="text-metal">Conheça nossas marcas</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
          Seleção de marcas de cosméticos capilares — clique em uma marca para explorar o catálogo
          completo.
        </p>
      </Reveal>

      <ul className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((b, i) => (
          <Reveal as="li" key={b.id} delay={i * 90}>
            <button
              onClick={onEnter}
              className="sheen-on-hover surface-glass group h-full w-full rounded-2xl p-6 text-left transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/45 hover:shadow-[var(--glow-rose)]"
            >
              <div className="flex h-24 w-full items-center justify-center rounded-xl bg-white/95">
                <span className="font-display text-lg font-bold tracking-tight text-[oklch(0.2_0.05_265)]">
                  {b.name}
                </span>
              </div>
              <h2 className="mt-5 text-xl font-bold">{b.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{b.tagline}</p>
              <div className="mt-5 flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
                <span>{b.linhas}</span>
                <span className="text-primary transition-transform duration-500 group-hover:translate-x-1">
                  ver produtos →
                </span>
              </div>
            </button>
          </Reveal>
        ))}
      </ul>

      <Reveal delay={200} className="mt-16 flex justify-center">
        <button
          onClick={onEnter}
          className="rounded-full px-9 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-all duration-500 hover:scale-[1.04] hover:shadow-[var(--glow-rose)] rose-line"
        >
          Entrar no catálogo
        </button>
      </Reveal>
    </section>
  );
}