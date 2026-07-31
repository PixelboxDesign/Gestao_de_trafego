import { useEffect, useState, useRef } from "react";

type WaStatus = "disconnected" | "connecting" | "waiting_qr" | "connected" | "error";

interface StatusResponse {
  status: WaStatus;
  qr: string | null;
  mensagem: string;
}

const API = "http://localhost:3001";

export default function AbaWhatsApp() {
  const [status, setStatus]   = useState<WaStatus>("disconnected");
  const [qr, setQr]           = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("Verificando...");
  const [numero, setNumero]   = useState("");
  const [texto, setTexto]     = useState("");
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  async function fetchStatus() {
    try {
      const res = await fetch(`${API}/api/whatsapp/status`);
      const data: StatusResponse = await res.json();
      setStatus(data.status);
      setQr(data.qr);
      setMensagem(data.mensagem);
    } catch {
      setStatus("error");
      setMensagem("Servidor não acessível");
    }
  }

  useEffect(() => {
    fetchStatus();
    intervalRef.current = window.setInterval(fetchStatus, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  async function enviarMensagem() {
    if (!numero || !texto) return;
    setEnviando(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API}/api/whatsapp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero, mensagem: texto }),
      });
      const data = await res.json();
      setFeedback(data.ok ? "✅ Mensagem enviada!" : `❌ ${data.mensagem}`);
      if (data.ok) { setNumero(""); setTexto(""); }
    } catch {
      setFeedback("❌ Erro ao enviar");
    } finally {
      setEnviando(false);
    }
  }

  const dotClass = {
    disconnected: "dot dot-gray",
    connecting:   "dot dot-yellow",
    waiting_qr:  "dot dot-yellow",
    connected:    "dot dot-green",
    error:        "dot dot-red",
  }[status];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "auto" }}>

      {/* Status */}
      <div style={{ padding: "1.25rem", background: "var(--bg2)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "1rem" }}>
        <span className={dotClass} style={{ width: 12, height: 12 }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Status da Conexão</div>
          <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>{mensagem}</div>
        </div>
        <button className="btn btn-secondary" onClick={fetchStatus} style={{ marginLeft: "auto" }}>🔄 Atualizar</button>
      </div>

      {/* QR Code */}
      {status === "waiting_qr" && (
        <div className="qr-container">
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>📱 Escaneie o QR Code</div>
            <div style={{ fontSize: 13, color: "var(--text2)" }}>Abra o WhatsApp → Dispositivos Conectados → Conectar Dispositivo</div>
          </div>
          {qr ? (
            <div className="qr-box">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qr)}`}
                alt="QR Code WhatsApp" width={250} height={250} />
            </div>
          ) : (
            <div style={{ color: "var(--text2)" }}>Carregando QR...</div>
          )}
        </div>
      )}

      {/* Conectado — formulário de envio */}
      {status === "connected" && (
        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 500 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>📤 Enviar Mensagem</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Número (com DDD)</label>
            <input className="input" placeholder="Ex: 75999998888" value={numero} onChange={e => setNumero(e.target.value)} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Mensagem</label>
            <textarea className="input" placeholder="Digite a mensagem..." value={texto}
              onChange={e => setTexto(e.target.value)}
              style={{ minHeight: 100, resize: "vertical", fontFamily: "inherit" }} />
          </div>

          <button className="btn btn-success" onClick={enviarMensagem} disabled={enviando || !numero || !texto}>
            {enviando ? "Enviando..." : "Enviar"}
          </button>

          {feedback && (
            <div style={{ fontSize: 13, padding: "0.5rem 0.75rem", borderRadius: 6,
              background: feedback.startsWith("✅") ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              color: feedback.startsWith("✅") ? "var(--success)" : "var(--danger)" }}>
              {feedback}
            </div>
          )}
        </div>
      )}

      {/* Desconectado */}
      {(status === "disconnected" || status === "error") && (
        <div className="empty">
          <span style={{ fontSize: 40 }}>💬</span>
          <div style={{ fontWeight: 600 }}>{status === "error" ? "Erro de conexão" : "WhatsApp desconectado"}</div>
          <div style={{ fontSize: 12 }}>{mensagem}</div>
        </div>
      )}
    </div>
  );
}
