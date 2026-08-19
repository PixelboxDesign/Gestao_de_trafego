import { useEffect, useState, useCallback } from "react";

const API = "http://localhost:3001";
const MARCA_PADRAO = "Alphahall"; // Marca padrão

interface Kit {
  nome: string;
  marca: string;
  tem_thumb: boolean;
  thumb_ext: string | null;
  imagens_carrossel: string[];
  info: {
    preco: string;
    descricao: string;
    sku_kit: string;
    skus_itens: string[];
  };
}

interface ModalState {
  kit: Kit;
  nomeEditavel: string;
  preco: string;
  descricao: string;
  skuKit: string;
  skusItens: string[];
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
      const res = await fetch(`${API}/api/catalogo/kits/${encodeURIComponent(MARCA_PADRAO)}`);
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
      preco: kit.info.preco || "",
      descricao: kit.info.descricao || "",
      skuKit: kit.info.sku_kit || "",
      skusItens: kit.info.skus_itens || [],
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

    const formData = new FormData();
    formData.append('imagem', file);

    try {
      const res = await fetch(`${API}/api/catalogo/upload-thumb/${encodeURIComponent(modal.kit.marca)}/${encodeURIComponent(modal.kit.nome)}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.ok) {
        alert('Thumbnail atualizada com sucesso!');
        carregar(); // Recarrega a lista
      } else {
        alert('Erro: ' + data.erro);
      }
    } catch (err) {
      alert('Erro ao fazer upload');
    }
  }

  async function handleCarrosselUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!modal) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Tipo inválido. Use JPG, PNG ou WebP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    const formData = new FormData();
    formData.append('imagem', file);

    try {
      const res = await fetch(`${API}/api/catalogo/upload-carrossel/${encodeURIComponent(modal.kit.marca)}/${encodeURIComponent(modal.kit.nome)}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.ok) {
        alert('Imagem adicionada ao carrossel!');
        carregar(); // Recarrega a lista
      } else {
        alert('Erro: ' + data.erro);
      }
    } catch (err) {
      alert('Erro ao fazer upload');
    }
  }

  async function deletarImagemCarrossel(arquivo: string) {
    if (!modal) return;
    if (!confirm(`Deletar a imagem ${arquivo}?`)) return;

    try {
      const res = await fetch(`${API}/api/catalogo/deletar-imagem/${encodeURIComponent(modal.kit.marca)}/${encodeURIComponent(modal.kit.nome)}/${encodeURIComponent(arquivo)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.ok) {
        alert('Imagem deletada!');
        carregar(); // Recarrega a lista
      } else {
        alert('Erro: ' + data.erro);
      }
    } catch (err) {
      alert('Erro ao deletar');
    }
  }

  async function salvar() {
    if (!modal) return;
    setModal(m => m ? { ...m, salvando: true, salvo: false } : m);

    try {
      const novoNome = modal.nomeEditavel.trim() !== modal.kit.nome ? modal.nomeEditavel.trim() : undefined;

      const res = await fetch(`${API}/api/catalogo/salvar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marca: modal.kit.marca,
          kit: modal.kit.nome,
          novo_nome: novoNome,
          preco: modal.preco,
          descricao: modal.descricao,
          sku_kit: modal.skuKit,
          skus_itens: modal.skusItens,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setModal(m => m ? { ...m, salvando: false, salvo: true } : m);
        
        // Atualiza o kit na lista local
        setKits(prev => prev.map(k => {
          if (k.nome === modal.kit.nome) {
            return {
              ...k,
              nome: data.novo_nome || k.nome,
              info: {
                preco: modal.preco,
                descricao: modal.descricao,
                sku_kit: modal.skuKit,
                skus_itens: modal.skusItens,
              }
            };
          }
          return k;
        }));

        setTimeout(() => setModal(m => m ? { ...m, salvo: false } : m), 2000);
      } else {
        alert("Erro ao salvar: " + (data.erro ?? "desconhecido"));
        setModal(m => m ? { ...m, salvando: false } : m);
      }
    } catch {
      alert("Erro de conexão ao salvar.");
      setModal(m => m ? { ...m, salvando: false } : m);
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
                  src={`${API}/api/catalogo/imagem/${encodeURIComponent(modal.kit.marca)}/${encodeURIComponent(modal.kit.nome)}/thumb.${modal.kit.thumb_ext}?t=${Date.now()}`}
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

            {/* Campos editáveis */}
            <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "400px", overflowY: "auto" }}>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Preço
                </label>
                <input
                  className="input"
                  value={modal.preco}
                  onChange={e => setModal(m => m ? { ...m, preco: e.target.value } : m)}
                  placeholder="Ex: R$ 89,90"
                  style={{ fontSize: 15 }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Descrição do Produto
                </label>
                <textarea
                  className="input"
                  value={modal.descricao}
                  onChange={e => setModal(m => m ? { ...m, descricao: e.target.value } : m)}
                  placeholder="Descrição do produto..."
                  rows={4}
                  style={{ resize: "vertical", fontFamily: "inherit", fontSize: 13, lineHeight: 1.6 }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  SKU do Kit
                </label>
                <input
                  className="input"
                  value={modal.skuKit}
                  onChange={e => setModal(m => m ? { ...m, skuKit: e.target.value } : m)}
                  placeholder="SKU principal do kit"
                  style={{ fontSize: 13 }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    SKUs dos Itens
                  </label>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setModal(m => m ? { ...m, skusItens: [...m.skusItens, ""] } : m)}
                    style={{ padding: "0.25rem 0.5rem", fontSize: 12 }}
                  >
                    ➕ Adicionar SKU
                  </button>
                </div>
                {modal.skusItens.length === 0 && (
                  <p style={{ fontSize: 12, color: "var(--text2)", fontStyle: "italic" }}>
                    Nenhum SKU de item adicionado. Clique em "Adicionar SKU" para incluir.
                  </p>
                )}
                {modal.skusItens.map((sku, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <input
                      className="input"
                      value={sku}
                      onChange={e => {
                        const novos = [...modal.skusItens];
                        novos[idx] = e.target.value;
                        setModal(m => m ? { ...m, skusItens: novos } : m);
                      }}
                      placeholder={`SKU do item ${idx + 1}`}
                      style={{ fontSize: 13, flex: 1 }}
                    />
                    <button
                      onClick={() => {
                        const novos = modal.skusItens.filter((_, i) => i !== idx);
                        setModal(m => m ? { ...m, skusItens: novos } : m);
                      }}
                      style={{
                        background: "none",
                        border: "1px solid var(--danger)",
                        color: "var(--danger)",
                        borderRadius: 4,
                        padding: "0.25rem 0.5rem",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
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
              </div>

              {/* Upload de Imagens do Carrossel */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    🖼️ Imagens do Carrossel
                  </label>
                  <input
                    type="file"
                    id="upload-carrossel"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={handleCarrosselUpload}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={() => document.getElementById('upload-carrossel')?.click()}
                    style={{ padding: "0.25rem 0.5rem", fontSize: 12 }}
                  >
                    ➕ Adicionar Imagem
                  </button>
                </div>
                {modal.kit.imagens_carrossel.length === 0 && (
                  <p style={{ fontSize: 12, color: "var(--text2)", fontStyle: "italic" }}>
                    Nenhuma imagem no carrossel. Clique em "Adicionar Imagem".
                  </p>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: "0.5rem" }}>
                  {modal.kit.imagens_carrossel.map((img, idx) => (
                    <div key={idx} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                      <img
                        src={`${API}/api/catalogo/imagem/${encodeURIComponent(modal.kit.marca)}/${encodeURIComponent(modal.kit.nome)}/${img}`}
                        alt={`Carrossel ${idx + 1}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <button
                        onClick={() => deletarImagemCarrossel(img)}
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          background: "rgba(239,68,68,0.9)",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          padding: "0.25rem 0.35rem",
                          cursor: "pointer",
                          fontSize: 10,
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer do modal */}
            <div style={{
              padding: "1rem 1.5rem",
              borderTop: "1px solid var(--border)",
              display: "flex", justifyContent: "flex-end", gap: "0.75rem",
              alignItems: "center",
            }}>
              {modal.salvo && (
                <span style={{ fontSize: 13, color: "var(--success)", fontWeight: 600 }}>
                  ✅ Salvo com sucesso!
                </span>
              )}
              <button className="btn btn-secondary" onClick={fecharModal}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={salvar}
                disabled={modal.salvando}
              >
                {modal.salvando ? "Salvando..." : "💾 Salvar"}
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
            src={`${API}/api/catalogo/imagem/${encodeURIComponent(kit.marca)}/${encodeURIComponent(kit.nome)}/thumb.${kit.thumb_ext}`}
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
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", lineHeight: 1.3, margin: 0 }}>
          {kit.nome}
        </h3>

        {kit.info.preco && (
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--primary)" }}>
            {kit.info.preco}
          </span>
        )}

        {kit.info.descricao && (
          <p style={{
            fontSize: 11, color: "var(--text2)", lineHeight: 1.5,
            margin: 0, overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          } as React.CSSProperties}>
            {kit.info.descricao}
          </p>
        )}

        {!kit.info.preco && !kit.info.descricao && (
          <span style={{ fontSize: 11, color: "var(--border)", fontStyle: "italic" }}>
            Clique para editar
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
