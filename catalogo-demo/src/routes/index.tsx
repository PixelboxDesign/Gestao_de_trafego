import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BrandsIntro } from "@/components/BrandsIntro";
import { CatalogViewport } from "@/components/CatalogViewport";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Catálogo Capilar — Marcas e Produtos" },
      {
        name: "description",
        content:
          "Explore marcas e produtos de cosméticos capilares em um catálogo visual com seleção de itens.",
      },
      { property: "og:title", content: "Catálogo Capilar — Marcas e Produtos" },
      {
        property: "og:description",
        content:
          "Explore marcas e produtos de cosméticos capilares em um catálogo visual com seleção de itens.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [view, setView] = useState<"brands" | "catalog">("brands");

  return (
    <main className="min-h-screen">
      <div key={view} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        {view === "brands" ? (
          <BrandsIntro
            onEnter={() => {
              setView("catalog");
              window.scrollTo({ top: 0 });
            }}
          />
        ) : (
          <CatalogViewport
            onBack={() => {
              setView("brands");
              window.scrollTo({ top: 0 });
            }}
          />
        )}
      </div>
    </main>
  );
}
