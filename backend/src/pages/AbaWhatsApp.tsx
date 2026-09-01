import { useEffect, useState, useRef } from "react";
import { API_BASE_URL } from "../config";

const API = API_BASE_URL;

type Status = "disconnected" | "qr" | "connecting" | "connected" | "error";
type SubAba = "gerenciamento" | "historico";

interface WaStatus {
  status: Status;
  qr_base64: string | null;
  numero: string | null;
  erro: string | null;
}

interface KitOuProduto {
  id: number;
  nome: string;
  tipo: "kit" | "produto";
  thumb_url: string | null;
}

interface ConfigDisparo {
  mensagem: string;
  itemSelecionado: KitOuProduto | null;
  quantidade: number;
  intervaloHoras: number;
}

export default function AbaWhatsApp() {
  const [subAba, setSubAba] = useState<SubAba>("gerenciamento");
  const [wa, setWa] = useState<WaStatus>({
    status: "disconnected",
    qr_base64: null,
    numero: null,
    erro: null,
  });
  const [carregando, setCarregando] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Estados do gerenciamento de disparo
  const [config, setConfig] = useState<ConfigDisparo>({
    mensagem: "",
    itemSelecionado: null,
    quantidade: 10,
    intervaloHoras: 1,
  });
  const [itensDisponiveis, setItensDisponiveis] = useState<KitOuProduto[]>([]);
  const [buscaItem, setBuscaItem] = useState("");

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

  // Carregar kits e produtos para o dropdown
  useEffect(() => {
    async function carregarItens() {
      try {
        const res = await fetch(`${API}/api/catalogo/v2/kits-e-produtos`);
        const data = await res.json();
        setItensDisponiveis(data);
      } catch (err) {
        console.error("Erro ao carregar itens:", err);
      }
    }
    carregarItens();
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

  async function iniciarDisparo() {
    if (!config.mensagem || !config.itemSelecionado) {
      alert("Preencha a mensagem e selecione um kit/produto");
      return;
    }

    if (wa.status !== "connected") {
      alert("WhatsApp não está conectado");
      return;
    }

    setCarregando(true);
    try {
      const res = await fetch(`${API}/api/disparos/iniciar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagem: config.mensagem,
          item_id: config.itemSelecionado.id,
          item_tipo: config.itemSelecionado.tipo,
          quantidade: config.quantidade,
          intervalo_horas: config.intervaloHoras,
        }),
      });

      if (res.ok) {
        alert("Disparo iniciado com sucesso!");
        setSubAba("historico");
      } else {
        const erro = await res.text();
        alert("Erro ao iniciar disparo: " + erro);
      }
    } catch (err: any) {
      alert("Erro: " + err.message);
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

  const itensFiltrados = itensDisponiveis.filter(item =>
    item.nome.toLowerCase().includes(buscaItem.toLowerCase())
  );

  const intervaloSegundos = config.quantidade > 0 
    ? Math.floor((config.intervaloHoras * 3600) / config.quantidade) 
    : 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "2rem", gap: "1.5rem", overflowY: "auto", alignItems: "center" }}>

      {/* Card de status (mantém funcionalidade original) */}
      <div style={{
        background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12,
        padding: "1.5rem 2rem", width: "100%", maxWidth: 900,
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

      {/* QR Code (mantém funcionalidade original) */}
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

      {/* Conectando (mantém funcionalidade original) */}
      {wa.status === "connecting" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", color: "var(--text2)" }}>
          <div style={{ fontSize: 32 }}>⏳</div>
          <p style={{ fontSize: 14 }}>Autenticando sessão, aguarde...</p>
        </div>
      )}

      {/* Desconectado (mantém funcionalidade original) */}
      {wa.status === "disconnected" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", color: "var(--text2)" }}>
          <div style={{ fontSize: 40 }}>📵</div>
          <p style={{ fontSize: 14, textAlign: "center", maxWidth: 420 }}>
            O WhatsApp Sidecar não está rodando ou não conseguiu inicializar.
          </p>
          <div style={{ fontSize: 12, background: "var(--bg3)", padding: "1rem", borderRadius: 8, maxWidth: 420, lineHeight: 1.6 }}>
            <strong>Para iniciar o WhatsApp:</strong><br />
            1. Execute <code style={{ background: "var(--bg)", padding: "2px 6px", borderRadius: 4 }}>INICIAR-LUNA-SERVER-COMPLETO.bat</code><br />
            2. Ou manualmente: <code style={{ background: "var(--bg)", padding: "2px 6px", borderRadius: 4 }}>cd whatsapp-sidecar && node server.js</code><br /><br />
            {wa.erro && <span style={{ color: "var(--danger)" }}>Erro: {wa.erro}</span>}
          </div>
        </div>
      )}

      {/* SUB-ABAS: Gerenciamento e Histórico */}
      {wa.status === "connected" && (
        <div style={{ width: "100%", maxWidth: 900 }}>
          {/* Navegação das sub-abas */}
          <div style={{ display: "flex", gap: "0.5rem", borderBottom: "2px solid var(--border)", marginBottom: "1.5rem" }}>
            <button
              onClick={() => setSubAba("gerenciamento")}
              style={{
                padding: "0.75rem 1.5rem",
                background: subAba === "gerenciamento" ? "var(--primary)" : "transparent",
                color: subAba === "gerenciamento" ? "white" : "var(--text2)",
                border: "none",
                borderBottom: subAba === "gerenciamento" ? "2px solid var(--primary)" : "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                transition: "all 0.2s"
              }}
            >
              📤 Gerenciamento
            </button>
            <button
              onClick={() => setSubAba("historico")}
              style={{
                padding: "0.75rem 1.5rem",
                background: subAba === "historico" ? "var(--primary)" : "transparent",
                color: subAba === "historico" ? "white" : "var(--text2)",
                border: "none",
                borderBottom: subAba === "historico" ? "2px solid var(--primary)" : "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                transition: "all 0.2s"
              }}
            >
              📊 Histórico
            </button>
          </div>

          {/* Conteúdo: Gerenciamento */}
          {subAba === "gerenciamento" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>
                Configurar Disparo de Mensagens
              </h3>

              {/* Campo: Mensagem */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                  Mensagem
                </label>
                <textarea
                  value={config.mensagem}
                  onChange={(e) => setConfig({ ...config, mensagem: e.target.value })}
                  placeholder="Digite a mensagem que será enviada..."
                  style={{
                    padding: "0.75rem",
                    fontSize: 14,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    color: "var(--text)",
                    resize: "vertical",
                    minHeight: 120,
                    fontFamily: "inherit"
                  }}
                />
              </div>

              {/* Campo: Kit ou Produto (com busca) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                  Kit ou Produto (imagem do disparo)
                </label>
                <input
                  type="text"
                  value={buscaItem}
                  onChange={(e) => setBuscaItem(e.target.value)}
                  placeholder="Digite o nome do kit ou produto..."
                  style={{
                    padding: "0.75rem",
                    fontSize: 14,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    color: "var(--text)"
                  }}
                />

                {/* Dropdown de itens */}
                {buscaItem && itensFiltrados.length > 0 && (
                  <div style={{
                    background: "var(--bg2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    maxHeight: 300,
                    overflowY: "auto",
                    marginTop: "0.25rem"
                  }}>
                    {itensFiltrados.map((item) => (
                      <div
                        key={`${item.tipo}-${item.id}`}
                        onClick={() => {
                          setConfig({ ...config, itemSelecionado: item });
                          setBuscaItem(item.nome);
                        }}
                        style={{
                          padding: "0.75rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          borderBottom: "1px solid var(--border)",
                          transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg3)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        {item.thumb_url && (
                          <img
                            src={item.thumb_url}
                            alt={item.nome}
                            style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover" }}
                          />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{item.nome}</div>
                          <div style={{ fontSize: 12, color: "var(--text2)" }}>{item.tipo === "kit" ? "Kit" : "Produto"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Item selecionado */}
                {config.itemSelecionado && (
                  <div style={{
                    marginTop: "0.5rem",
                    padding: "1rem",
                    background: "var(--bg2)",
                    border: "1px solid var(--success)",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem"
                  }}>
                    {config.itemSelecionado.thumb_url && (
                      <img
                        src={config.itemSelecionado.thumb_url}
                        alt={config.itemSelecionado.nome}
                        style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover" }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--success)" }}>✓ Selecionado</div>
                      <div style={{ fontSize: 14, color: "var(--text)" }}>{config.itemSelecionado.nome}</div>
                      <div style={{ fontSize: 12, color: "var(--text2)" }}>
                        {config.itemSelecionado.tipo === "kit" ? "Kit" : "Produto"}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Campos: Quantidade e Intervalo */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                    Quantidade de Mensagens
                  </label>
                  <input
                    type="number"
                    value={config.quantidade}
                    onChange={(e) => setConfig({ ...config, quantidade: Math.max(1, parseInt(e.target.value) || 1) })}
                    min="1"
                    style={{
                      padding: "0.75rem",
                      fontSize: 14,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--text)"
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                    Intervalo (horas)
                  </label>
                  <input
                    type="number"
                    value={config.intervaloHoras}
                    onChange={(e) => setConfig({ ...config, intervaloHoras: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
                    min="0.1"
                    step="0.5"
                    style={{
                      padding: "0.75rem",
                      fontSize: 14,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--text)"
                    }}
                  />
                </div>
              </div>

              {/* Cálculo do intervalo */}
              {config.quantidade > 0 && config.intervaloHoras > 0 && (
                <div style={{
                  padding: "1rem",
                  background: "var(--bg3)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 13,
                  color: "var(--text2)"
                }}>
                  ⏱️ Cada mensagem será enviada a cada <strong style={{ color: "var(--primary)" }}>{intervaloSegundos} segundos</strong>
                  <br />
                  ({config.quantidade} mensagens em {config.intervaloHoras}h = intervalo de {intervaloSegundos}s entre cada envio)
                </div>
              )}

              {/* Botão: Iniciar Disparo */}
              <button
                onClick={iniciarDisparo}
                disabled={carregando || !config.mensagem || !config.itemSelecionado}
                className="btn btn-primary"
                style={{
                  padding: "1rem",
                  fontSize: 16,
                  fontWeight: 700,
                  borderRadius: 8,
                  opacity: (carregando || !config.mensagem || !config.itemSelecionado) ? 0.5 : 1,
                  cursor: (carregando || !config.mensagem || !config.itemSelecionado) ? "not-allowed" : "pointer"
                }}
              >
                {carregando ? "Iniciando..." : "🚀 Iniciar Disparo"}
              </button>
            </div>
          )}

          {/* Conteúdo: Histórico */}
          {subAba === "historico" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>
                Histórico de Disparos
              </h3>
              <div style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--text2)",
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                borderRadius: 8
              }}>
                <div style={{ fontSize: 48, marginBottom: "1rem" }}>📊</div>
                <p>Histórico de disparos será implementado em breve</p>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
