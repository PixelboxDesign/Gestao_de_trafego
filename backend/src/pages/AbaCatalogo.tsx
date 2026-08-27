import { useEffect, useState, useCallback } from "react";

const API = "http://localhost:3001";
const MARCA_PADRAO = "Alphahall"; // Marca padrão

interface Kit {
  id: number;
  produto_id: string;
  sku: string;
  nome: string;
  tipo: string;
  preco: number;
  descricao: string;
  eh_kit: boolean;
  tem_thumb: boolean;
  thumb_ext: string | null;
  componentes: Componente[];
}

interface Componente {
  produto_id: string;
  sku: string | null;
  nome: string;
  quantidade: number;
}

interface ModalState {
  kit: Kit;
  nomeEditavel: string;
  preco: string;
  descricao: string;
  salvando: boolean;
  salvo: boolean;
}

export default function AbaCatalogo() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`${API}/api/catalogo/v2/kits`);
      const data: Kit[] = await res.json();
      setKits(data);
    } catch {
      setErro("Não foi possível carregar o catálogo. Verifique se o servidor está rodando.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function abrirModal(kit: Kit) {
    setModal({
      kit,
      nomeEditavel: kit.nome,
      preco: kit.preco ? `R$ ${kit.preco.toFixed(2)}` : "",
      descricao: kit.descricao || "",
      salvando: false,
      salvo: false,
    });
  }

  function fecharModal() {
    setModal(null);
  }

  async function handleThumbUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!modal) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // Valida tipo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Tipo inválido. Use JPG, PNG ou WebP.');
      return;
    }

    // Valida tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    // Nome da pasta = nome do produto (sem SKU, sem prefixo)
    const nomePasta = modal.kit.nome.replace(/[<>:"/\\|?*]/g, '').trim();

    const formData = new FormData();
    formData.append('imagem', file);

    try {
      const res = await fetch(`${API}/api/catalogo/upload-thumb/${MARCA_PADRAO}/${encodeURIComponent(nomePasta)}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.ok) {
        alert('Thumbnail atualizada com sucesso!');
        carregar(); // Recarrega a lista
        fecharModal(); // Fecha o modal para recarregar a imagem
      } else {
        alert('Erro: ' + data.erro);
      }
    } catch (err) {
      alert('Erro ao fazer upload');
    }
  }

  const kitsFiltrados = kits.filter(k =>
    k.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>

      {/* Toolbar */}
      <div className="toolbar">
        <input
          className="input"
          placeholder="Buscar kit..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ width: 240 }}
        />
        <button className="btn btn-secondary" onClick={carregar} title="Recarregar">
          🔄 Atualizar
        </button>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text2)" }}>
          {loading ? "Carregando..." : `${kitsFiltrados.length} kit${kitsFiltrados.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>

        {erro && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid var(--danger)",
            borderRadius: 8, padding: "1rem", color: "var(--danger)", marginBottom: "1rem"
          }}>
            {erro}
          </div>
        )}

        {!loading && kitsFiltrados.length === 0 && !erro && (
          <div className="empty">
            <span style={{ fontSize: 48 }}>📦</span>
            <p>{busca ? "Nenhum kit encontrado para essa busca" : "Nenhum kit no catálogo ainda"}</p>
            <p style={{ fontSize: 12 }}>
              Crie subpastas em <code style={{ background: "var(--bg3)", padding: "2px 6px", borderRadius: 4 }}>
                F:\luna_cosmeticos\catalogos\
              </code> para adicionar kits
            </p>
          </div>
        )}

        {/* Grid de cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1.25rem",
        }}>
          {kitsFiltrados.map(kit => (
            <KitCard
              key={kit.nome}
              kit={kit}
              onClick={() => abrirModal(kit)}
            />
          ))}
        </div>
      </div>

      {/* Modal de edição */}
      {modal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem",
          }}
          onClick={e => { if (e.target === e.currentTarget) fecharModal(); }}
        >
          <div style={{
            background: "var(--bg2)", borderRadius: 14,
            border: "1px solid var(--border)",
            width: "100%", maxWidth: 520,
            display: "flex", flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}>
            {/* Header do modal */}
            <div style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between"
            }}>
              <input
                className="input"
                value={modal.nomeEditavel}
                onChange={e => setModal(m => m ? { ...m, nomeEditavel: e.target.value } : m)}
                style={{ fontSize: 16, fontWeight: 700, flex: 1, marginRight: "1rem" }}
                placeholder="Nome do kit"
              />
              <button
                onClick={fecharModal}
                style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer", fontSize: 20, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Imagem */}
            {modal.kit.tem_thumb && (
              <div style={{ background: "var(--bg3)", display: "flex", justifyContent: "center", padding: "1rem" }}>
                <img
                  src={`${API}/api/catalogo/imagem/${MARCA_PADRAO}/${encodeURIComponent(modal.kit.nome.replace(/[<>:"/\\|?*]/g, '').trim())}/thumb.${modal.kit.thumb_ext}?t=${Date.now()}`}
                  alt={modal.kit.nome}
                  style={{
                    maxHeight: 200, maxWidth: "100%",
                    objectFit: "contain", borderRadius: 8,
                  }}
                />
              </div>
            )}

            {/* Sem imagem */}
            {!modal.kit.tem_thumb && (
              <div style={{
                background: "var(--bg3)", height: 120,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "0.5rem",
                color: "var(--text2)", fontSize: 12,
              }}>
                <span style={{ fontSize: 32 }}>🖼️</span>
                <span>Escolha uma thumb abaixo</span>
              </div>
            )}

            {/* Campos de informação (com SKUs visíveis) */}
            <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "400px", overflowY: "auto" }}>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  SKU do Kit
                </label>
                <input
                  className="input"
                  value={modal.kit.sku || "Sem SKU cadastrado"}
                  readOnly
                  style={{ fontSize: 15, background: "var(--bg3)", cursor: "not-allowed", fontWeight: 700, color: "var(--primary)" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Preço
                </label>
                <input
                  className="input"
                  value={modal.preco || "Não informado"}
                  readOnly
                  style={{ fontSize: 15, background: "var(--bg3)", cursor: "not-allowed" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Descrição do Produto
                </label>
                <textarea
                  className="input"
                  value={modal.descricao || "Nenhuma descrição disponível"}
                  readOnly
                  rows={4}
                  style={{ resize: "vertical", fontFamily: "inherit", fontSize: 13, lineHeight: 1.6, background: "var(--bg3)", cursor: "not-allowed" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Produtos que Compõem Este Kit ({modal.kit.componentes.length})
                </label>
                {modal.kit.componentes.length === 0 && (
                  <p style={{ fontSize: 12, color: "var(--text2)", fontStyle: "italic", padding: "0.75rem", background: "var(--bg3)", borderRadius: 6 }}>
                    ⚠️ Nenhum componente cadastrado no banco de dados.
                  </p>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {modal.kit.componentes.map((comp, idx) => (
                    <div key={idx} style={{ 
                      padding: "0.75rem", 
                      background: "var(--bg3)", 
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ 
                          fontWeight: 700, 
                          color: "var(--primary)", 
                          fontSize: 14,
                          minWidth: "40px"
                        }}>
                          {comp.quantidade}x
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{comp.nome}</span>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", marginLeft: "48px", fontSize: 11, color: "var(--text2)" }}>
                        {comp.sku ? (
                          <>
                            <span>📦 SKU:</span>
                            <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{comp.sku}</span>
                          </>
                        ) : (
                          <span style={{ fontStyle: "italic" }}>Sem SKU cadastrado</span>
                        )}
                        {comp.produto_id && (
                          <>
                            <span style={{ marginLeft: "1rem" }}>🔖 ID:</span>
                            <span style={{ fontFamily: "monospace" }}>{comp.produto_id}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload de Thumbnail */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  📸 Imagem Thumbnail (Capa)
                </label>
                <input
                  type="file"
                  id="upload-thumb"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={handleThumbUpload}
                />
                <button
                  className="btn btn-secondary"
                  onClick={() => document.getElementById('upload-thumb')?.click()}
                  style={{ width: "100%" }}
                >
                  {modal.kit.tem_thumb ? "🔄 Alterar Thumbnail" : "➕ Adicionar Thumbnail"}
                </button>
                <p style={{ fontSize: 11, color: "var(--text2)", fontStyle: "italic", margin: 0 }}>
                  💡 Para editar preço, descrição, SKUs ou componentes, edite diretamente no banco de dados MySQL.
                </p>
              </div>

            </div>

            {/* Footer do modal */}
            <div style={{
              padding: "1rem 1.5rem",
              borderTop: "1px solid var(--border)",
              display: "flex", justifyContent: "flex-end", gap: "0.75rem",
              alignItems: "center",
            }}>
              <button className="btn btn-primary" onClick={fecharModal}>
                ✅ Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Card individual ──────────────────────────────────────────────────────────

function KitCard({ kit, onClick }: { kit: Kit; onClick: () => void }) {
  const [imgErro, setImgErro] = useState(false);

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.15s, transform 0.1s, box-shadow 0.15s",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--primary)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(233,30,99,0.15)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Área da imagem */}
      <div style={{
        background: "var(--bg3)",
        height: 160,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        {kit.tem_thumb && !imgErro ? (
          <img
            src={`${API}/api/catalogo/imagem/${MARCA_PADRAO}/${encodeURIComponent(kit.nome.replace(/[<>:"/\\|?*]/g, '').trim())}/thumb.${kit.thumb_ext}`}
            alt={kit.nome}
            onError={() => setImgErro(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ fontSize: 40, opacity: 0.3 }}>📦</span>
        )}
      </div>

      {/* Info do card */}
      <div style={{ padding: "0.875rem 1rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", lineHeight: 1.3, margin: 0, flex: 1 }}>
            {kit.nome}
          </h3>
          {kit.sku && (
            <span style={{ 
              fontSize: 9, 
              fontWeight: 700, 
              color: "var(--text2)", 
              background: "var(--bg3)", 
              padding: "2px 6px", 
              borderRadius: 4,
              fontFamily: "monospace",
              letterSpacing: "0.5px"
            }}>
              {kit.sku}
            </span>
          )}
        </div>

        {kit.preco > 0 && (
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--primary)" }}>
            R$ {kit.preco.toFixed(2)}
          </span>
        )}

        {kit.descricao && (
          <p style={{
            fontSize: 11, color: "var(--text2)", lineHeight: 1.5,
            margin: 0, overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          } as React.CSSProperties}>
            {kit.descricao}
          </p>
        )}

        {!kit.preco && !kit.descricao && (
          <span style={{ fontSize: 11, color: "var(--border)", fontStyle: "italic" }}>
            Clique para ver detalhes
          </span>
        )}

        {kit.componentes.length > 0 && (
          <span style={{ fontSize: 10, color: "var(--text2)", marginTop: "0.25rem" }}>
            📦 {kit.componentes.length} {kit.componentes.length === 1 ? 'produto' : 'produtos'}
          </span>
        )}
      </div>

      {/* Rodapé do card */}
      <div style={{
        padding: "0.5rem 1rem",
        borderTop: "1px solid var(--border)",
        fontSize: 11, color: "var(--text2)",
        display: "flex", alignItems: "center", gap: "0.4rem",
      }}>
        ✏️ Editar
      </div>
    </div>
  );
}
