import { useState } from "react";
import AbaClientes from "./pages/AbaClientes";
import AbaWhatsApp from "./pages/AbaWhatsApp";
import AbaLogs from "./pages/AbaLogs";

type Aba = "clientes" | "whatsapp" | "logs";

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState<Aba>("clientes");

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <span style={{ fontSize: 20 }}>🌙</span>
        <span className="header-title">Luna Server — Painel de Controle</span>
        <div className="header-status">
          <span className="dot dot-green" />
          <span>API Online · Porta 3001</span>
        </div>
      </header>

      {/* Tabs */}
      <nav className="tabs">
        <button
          className={`tab ${abaAtiva === "clientes" ? "active" : ""}`}
          onClick={() => setAbaAtiva("clientes")}
        >
          👥 Clientes
        </button>
        <button
          className={`tab ${abaAtiva === "whatsapp" ? "active" : ""}`}
          onClick={() => setAbaAtiva("whatsapp")}
        >
          💬 WhatsApp
        </button>
        <button
          className={`tab ${abaAtiva === "logs" ? "active" : ""}`}
          onClick={() => setAbaAtiva("logs")}
        >
          📋 Logs
        </button>
      </nav>

      {/* Conteúdo */}
      <main className="content">
        {abaAtiva === "clientes" && <AbaClientes />}
        {abaAtiva === "whatsapp" && <AbaWhatsApp />}
        {abaAtiva === "logs"     && <AbaLogs />}
      </main>
    </div>
  );
}
