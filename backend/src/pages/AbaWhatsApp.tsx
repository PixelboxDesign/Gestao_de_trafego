import { useEffect, useState, useRef } from "react";

const API = "http://localhost:3001";

type Status = "disconnected" | "qr" | "connecting" | "connected" | "error";

interface WaStatus {
  status: Status;
  qr_base64: string | null;
  numero: string | null;
  erro: string | null;
}

export default function AbaWhatsApp() {
  const [wa, setWa] = useState<WaStatus>({
    status: "disconnected",
    qr_base64: null,
    numero: null,
    erro: null,
  });
  const [carregando, setCarregando] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function buscarStatus() {
    try {
      const res = await fetch(`${API}/api/whatsapp/status`);
      const data = await res.json();
      setWa(data);
    } catch {
      setWa(prev => ({ ...prev, status: "error", erro: "Sidecar não responde" }));
    }
  }

  // Polling a cada 3 segundos
  useEffect(() => {
    buscarStatus();
    intervalRef.current = setInterval(buscarStatus, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function desconectar() {
    setCarregando(true);
    try {
      await fetch(`${API}/api/whatsapp/desconectar`, { method: "POST" });
      await buscarStatus();
    } finally {
      setCarregando(false);
    }
  }

  const statusInfo = {
    disconnected: { cor: "var(--danger)",  dot: "dot-red",    texto: "Desconectado" },
    qr:           { cor: "var(--warning)", dot: "dot-yellow", texto: "Aguardando leitura do QR Code" },
    connecting:   { cor: "var(--warning)", dot: "dot-yellow", texto: "Conectando..." },
    connected:    { cor: "var(--success)", dot: "dot-green",  texto: "Conectado" },
    error:        { cor: "var(--danger)",  dot: "dot-red",    texto: "Erro" },
  }[wa.status];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem", gap: "1.5rem", overflowY: "auto" }}>

      {/* Card de status */}
      <div style={{
        background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12,
        padding: "1.5rem 2rem", width: "100%", maxWidth: 480,
        display: "flex", flexDirection: "column", gap: "0.75rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span className={`dot ${statusInfo.dot}`} style={{ width: 12, height: 12 }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: statusInfo.cor }}>
            {statusInfo.texto}
          </span>
        </div>

        {wa.numero && (
          <div style={{ fontSize: 13, color: "var(--text2)" }}>
            📱 Número conectado: <span style={{ color: "var(--success)", fontWeight: 600 }}>+{wa.numero}</span>
          </div>
        )}

        {wa.erro && wa.status === "error" && (
          <div style={{ fontSize: 12, color: "var(--danger)", background: "rgba(239,68,68,0.1)", padding: "0.5rem 0.75rem", borderRadius: 6 }}>
            {wa.erro}
          </div>
        )}

        {wa.status === "connected" && (
          <button
            className="btn btn-danger"
            onClick={desconectar}
            disabled={carregando}
            style={{ marginTop: "0.5rem", alignSelf: "flex-start" }}
          >
            {carregando ? "Desconectando..." : "Desconectar"}
          </button>
        )}
      </div>

      {/* QR Code */}
      {wa.status === "qr" && wa.qr_base64 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <p style={{ color: "var(--text2)", fontSize: 14, textAlign: "center", maxWidth: 320 }}>
            Abra o WhatsApp no celular → <strong>Dispositivos conectados</strong> → <strong>Conectar dispositivo</strong> → escaneie o QR Code abaixo
          </p>
          <div style={{
            background: "white", borderRadius: 12, padding: "1rem",
            boxShadow: "0 0 40px rgba(233,30,99,0.15)"
          }}>
            <img src={wa.qr_base64} alt="QR Code WhatsApp" style={{ width: 256, height: 256, display: "block" }} />
          </div>
          <p style={{ fontSize: 12, color: "var(--text2)" }}>O QR Code atualiza automaticamente a cada 60 segundos</p>
        </div>
      )}

      {/* Conectando */}
      {wa.status === "connecting" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", color: "var(--text2)" }}>
          <div style={{ fontSize: 32 }}>⏳</div>
          <p style={{ fontSize: 14 }}>Autenticando sessão, aguarde...</p>
        </div>
      )}

      {/* Desconectado — aguardando QR */}
      {wa.status === "disconnected" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", color: "var(--text2)" }}>
          <div style={{ fontSize: 40 }}>📵</div>
          <p style={{ fontSize: 14, textAlign: "center", maxWidth: 320 }}>
            Aguardando o QR Code ser gerado pelo sidecar WhatsApp...
          </p>
          <p style={{ fontSize: 12, color: "var(--text2)" }}>
            {wa.erro ?? "O sidecar inicializa automaticamente junto com o Luna Server"}
          </p>
        </div>
      )}

    </div>
  );
}
