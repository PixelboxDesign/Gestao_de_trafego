import { useState } from "react";
import AbaKits from "./AbaKits";
import AbaProdutos from "./AbaProdutos";

type SubAba = "kits" | "produtos";

export default function AbaCatalogo() {
  const [abaAtiva, setAbaAtiva] = useState<SubAba>("kits");

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      
      {/* Sub-abas */}
      <div style={{
        display: "flex",
        gap: "0.5rem",
        padding: "0.75rem 1rem",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg1)",
      }}>
        <button
          className={`btn ${abaAtiva === "kits" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setAbaAtiva("kits")}
          style={{
            fontSize: 13,
            fontWeight: 700,
            padding: "0.5rem 1.25rem",
          }}
        >
          📦 Kits
        </button>
        <button
          className={`btn ${abaAtiva === "produtos" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setAbaAtiva("produtos")}
          style={{
            fontSize: 13,
            fontWeight: 700,
            padding: "0.5rem 1.25rem",
          }}
        >
          🛍️ Produtos
        </button>
      </div>

      {/* Conteúdo da sub-aba ativa */}
      {abaAtiva === "kits" && <AbaKits />}
      {abaAtiva === "produtos" && <AbaProdutos />}
      
    </div>
  );
}
