import { useEffect, useState, useCallback } from "react";

const API = "http://localhost:3001";
const MARCA_PADRAO = "Alphahall";

interface Produto {
  id: number;
  produto_id: string;
  sku: string;
  nome: string;
  tipo: string;
  preco: number;
  descricao: string;
  descricao_peso: string;
  descricao_tamanho: string;
  descricao_composicao: string;
  tem_thumb: boolean;
  thumb_ext: string | null;
  imagens_carrossel: string[];
}

interface ModalState {
  produto: Produto;
  salvando: boolean;
  editandoSku: boolean;
  editandoPreco: boolean;
  editandoDescricao: boolean;
  editandoPeso: boolean;
  editandoTamanho: boolean;
  editandoComposicao: boolean;
  skuEditavel: string;
  precoEditavel: string;
  descricaoEditavel: string;
  pesoEditavel: string;
  tamanhoEditavel: string;
  composicaoEditavel: string;
}

export default function AbaProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`${API}/api/catalogo/v2/produtos-individuais`);
      const data: Produto[] = await res.json();
      setProdutos(data);
    } catch {
      setErro("Não foi possível carregar os produtos. Verifique se o servidor está rodando.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function abrirModal(produto: Produto) {
    setModal({
      produto,
      salvando: false,
      editandoSku: false,
      editandoPreco: false,
      editandoDescricao: false,
      editandoPeso: false,
      editandoTamanho: false,
      editandoComposicao: false,
      skuEditavel: produto.sku || "",
      precoEditavel: produto.preco ? produto.preco.toString() : "",
      descricaoEditavel: produto.descricao || "",
      pesoEditavel: produto.descricao_peso || "",
      tamanhoEditavel: produto.descricao_tamanho || "",
      composicaoEditavel: produto.descricao_composicao || "",
    });
  }

  function fecharModal() {
    setModal(null);
  }

  async function salvarCampo(campo: string, valor: string | number) {
    if (!modal) return;
    setModal(m => m ? { ...m, salvando: true } : m);

    const payload: any = {};
    
    if (campo === 'sku') payload.codigo_sku = valor;
    else if (campo === 'preco') payload.preco = typeof valor === 'string' ? parseFloat(valor) : valor;
    else if (campo === 'descricao') payload.descricao = valor;
    else if (campo === 'peso') payload.descricao_peso = valor;
    else if (campo === 'tamanho') payload.descricao_tamanho = valor;
    else if (campo === 'composicao') payload.descricao_composicao = valor;

    try {
      const res = await fetch(`${API}/api/catalogo/v2/produto/${modal.produto.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        alert(`${campo.charAt(0).toUpperCase() + campo.slice(1)} atualizado com sucesso!`);
        
        // Reseta estado de edição do campo correspondente
        if (campo === 'sku') setModal(m => m ? { ...m, editandoSku: false, salvando: false } : m);
        else if (campo === 'preco') setModal(m => m ? { ...m, editandoPreco: false, salvando: false } : m);
        else if (campo === 'descricao') setModal(m => m ? { ...m, editandoDescricao: false, salvando: false } : m);
        else if (campo === 'peso') setModal(m => m ? { ...m, editandoPeso: false, salvando: false } : m);
        else if (campo === 'tamanho') setModal(m => m ? { ...m, editandoTamanho: false, salvando: false } : m);
        else if (campo === 'composicao') setModal(m => m ? { ...m, editandoComposicao: false, salvando: false } : m);
        
        carregar();
      } else {
        alert('Erro: ' + data.erro);
        setModal(m => m ? { ...m, salvando: false } : m);
      }
    } catch {
      alert('Erro ao salvar');
      setModal(m => m ? { ...m, salvando: false } : m);
    }
  }

  async function deletarThumb() {
    if (!modal) return;
    if (!confirm('Deseja realmente deletar a thumbnail?')) return;

    const nomePasta = modal.produto.nome.replace(/[<>:"/\\|?*]/g, '').trim();

    try {
      const res = await fetch(`${API}/api/catalogo/deletar-thumb/${MARCA_PADRAO}/${encodeURIComponent(nomePasta)}?tipo=produto`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.ok) {
        alert('Thumbnail deletada com sucesso!');
        carregar();
        fecharModal();
      } else {
        alert('Erro: ' + data.erro);
      }
    } catch {
      alert('Erro ao deletar thumbnail');
    }
  }

  async function handleThumbUpload(e: React.ChangeEvent<HTMLInputElement>) {
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

    const nomePasta = modal.produto.nome.replace(/[<>:"/\\|?*]/g, '').trim();
    const formData = new FormData();
    formData.append('imagem', file);

    try {
      const res = await fetch(`${API}/api/catalogo/upload-thumb/${MARCA_PADRAO}/${encodeURIComponent(nomePasta)}?tipo=produto`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.ok) {
        alert('Thumbnail atualizada com sucesso!');
        carregar();
        fecharModal();
      } else {
        alert('Erro: ' + data.erro);
      }
    } catch {
      alert('Erro ao fazer upload');
    }
  }

  async function handleCarrosselUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!modal) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!validTypes.includes(file.type)) {
        alert(`Arquivo ${file.name}: tipo inválido. Use JPG, PNG ou WebP.`);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert(`Arquivo ${file.name}: muito grande. Máximo 5MB.`);
        continue;
      }

      const nomePasta = modal.produto.nome.replace(/[<>:"/\\|?*]/g, '').trim();
      const formData = new FormData();
      formData.append('imagem', file);

      try {
        const res = await fetch(`${API}/api/catalogo/upload-carrossel/${MARCA_PADRAO}/${encodeURIComponent(nomePasta)}?tipo=produto`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!data.ok) {
          alert(`Erro ao fazer upload de ${file.name}: ` + data.erro);
        }
      } catch {
        alert(`Erro ao fazer upload de ${file.name}`);
      }
    }

    alert('Upload concluído!');
    carregar();
    fecharModal();
  }

  async function deletarImagemCarrossel(arquivo: string) {
    if (!modal) return;
    if (!confirm(`Deseja realmente deletar a imagem "${arquivo}"?`)) return;

    const nomePasta = modal.produto.nome.replace(/[<>:"/\\|?*]/g, '').trim();

    try {
      const res = await fetch(
        `${API}/api/catalogo/deletar-imagem/${MARCA_PADRAO}/${encodeURIComponent(nomePasta)}/${arquivo}?tipo=produto`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (data.ok) {
        alert('Imagem deletada!');
        carregar();
        // Atualiza modal sem fechar
        const produtoAtualizado = await fetch(`${API}/api/catalogo/v2/produtos-individuais`).then(r => r.json());
        const novoProduto = produtoAtualizado.find((p: Produto) => p.id === modal.produto.id);
        if (novoProduto) {
          setModal({
            produto: novoProduto,
            salvando: false,
            editandoSku: false,
            editandoPreco: false,
            editandoDescricao: false,
            editandoPeso: false,
            editandoTamanho: false,
            editandoComposicao: false,
            skuEditavel: novoProduto.sku || "",
            precoEditavel: novoProduto.preco ? novoProduto.preco.toString() : "",
            descricaoEditavel: novoProduto.descricao || "",
            pesoEditavel: novoProduto.descricao_peso || "",
            tamanhoEditavel: novoProduto.descricao_tamanho || "",
            composicaoEditavel: novoProduto.descricao_composicao || "",
          });
        }
      } else {
        alert('Erro: ' + data.erro);
      }
    } catch {
      alert('Erro ao deletar imagem');
    }
  }

  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>

      {/* Toolbar */}
      <div className="toolbar">
        <input
          className="input"
          placeholder="Buscar produto..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ width: 240 }}
        />
        <button className="btn btn-secondary" onClick={carregar} title="Recarregar">
          🔄 Atualizar
        </button>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text2)" }}>
          {loading ? "Carregando..." : `${produtosFiltrados.length} produto${produtosFiltrados.length !== 1 ? "s" : ""}`}
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

        {!loading && produtosFiltrados.length === 0 && !erro && (
          <div className="empty">
            <span style={{ fontSize: 48 }}>📦</span>
            <p>{busca ? "Nenhum produto encontrado para essa busca" : "Nenhum produto no catálogo ainda"}</p>
          </div>
        )}

        {/* Grid de cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1.25rem",
        }}>
          {produtosFiltrados.map(produto => (
            <ProdutoCard
              key={produto.nome}
              produto={produto}
              onClick={() => abrirModal(produto)}
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
            width: "100%", maxWidth: 620,
            display: "flex", flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            maxHeight: "90vh",
          }}>
            {/* Header do modal */}
            <div style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between"
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{modal.produto.nome}</h2>
              <button
                onClick={fecharModal}
                style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer", fontSize: 20, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Scroll container */}
            <div style={{ overflowY: "auto", flex: 1 }}>

              {/* Thumbnail */}
              {modal.produto.tem_thumb && (
                <div style={{ background: "var(--bg3)", display: "flex", justifyContent: "center", padding: "1rem" }}>
                  <img
                    src={`${API}/api/catalogo/imagem/${MARCA_PADRAO}/produtos/${encodeURIComponent(modal.produto.nome.replace(/[<>:"/\\|?*]/g, '').trim())}/thumb.${modal.produto.thumb_ext}?t=${Date.now()}`}
                    alt={modal.produto.nome}
                    style={{
                      maxHeight: 200, maxWidth: "100%",
                      objectFit: "contain", borderRadius: 8,
                    }}
                  />
                </div>
              )}

              {!modal.produto.tem_thumb && (
                <div style={{
                  background: "var(--bg3)", height: 120,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: "0.5rem",
                  color: "var(--text2)", fontSize: 12,
                }}>
                  <span style={{ fontSize: 32 }}>🖼️</span>
                  <span>Escolha uma thumbnail abaixo</span>
                </div>
              )}

              {/* Campos de informação */}
              <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase" }}>
                    SKU
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      className="input"
                      value={modal.editandoSku ? modal.skuEditavel : (modal.produto.sku || "Sem SKU cadastrado")}
                      onChange={e => setModal(m => m ? { ...m, skuEditavel: e.target.value } : m)}
                      readOnly={!modal.editandoSku}
                      style={{ 
                        fontSize: 15, 
                        background: modal.editandoSku ? "var(--bg1)" : "var(--bg3)", 
                        cursor: modal.editandoSku ? "text" : "not-allowed", 
                        fontWeight: 700, 
                        color: "var(--primary)",
                        flex: 1
                      }}
                    />
                    {!modal.editandoSku ? (
                      <button
                        className="btn btn-secondary"
                        onClick={() => setModal(m => m ? { ...m, editandoSku: true } : m)}
                        style={{ padding: "0.5rem 1rem" }}
                      >
                        ✏️
                      </button>
                    ) : (
                      <>
                        <button
                          className="btn btn-primary"
                          onClick={() => salvarCampo('sku', modal.skuEditavel)}
                          disabled={modal.salvando}
                          style={{ padding: "0.5rem 1rem" }}
                        >
                          ✅
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setModal(m => m ? { ...m, editandoSku: false, skuEditavel: modal.produto.sku || "" } : m)}
                          style={{ padding: "0.5rem 1rem" }}
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase" }}>
                    Preço
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      className="input"
                      value={modal.editandoPreco ? modal.precoEditavel : (modal.produto.preco ? `R$ ${modal.produto.preco.toFixed(2)}` : "Não informado")}
                      onChange={e => setModal(m => m ? { ...m, precoEditavel: e.target.value } : m)}
                      readOnly={!modal.editandoPreco}
                      placeholder={modal.editandoPreco ? "Digite o preço (ex: 49.90)" : ""}
                      style={{ 
                        fontSize: 15, 
                        background: modal.editandoPreco ? "var(--bg1)" : "var(--bg3)", 
                        cursor: modal.editandoPreco ? "text" : "not-allowed",
                        flex: 1
                      }}
                    />
                    {!modal.editandoPreco ? (
                      <button
                        className="btn btn-secondary"
                        onClick={() => setModal(m => m ? { ...m, editandoPreco: true } : m)}
                        style={{ padding: "0.5rem 1rem" }}
                      >
                        ✏️
                      </button>
                    ) : (
                      <>
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            const preco = parseFloat(modal.precoEditavel);
                            if (isNaN(preco)) {
                              alert('Preço inválido');
                              return;
                            }
                            salvarCampo('preco', preco);
                          }}
                          disabled={modal.salvando}
                          style={{ padding: "0.5rem 1rem" }}
                        >
                          ✅
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setModal(m => m ? { ...m, editandoPreco: false, precoEditavel: modal.produto.preco?.toString() || "" } : m)}
                          style={{ padding: "0.5rem 1rem" }}
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase" }}>
                    📏 Peso
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                    <textarea
                      className="input"
                      value={modal.editandoPeso ? modal.pesoEditavel : (modal.produto.descricao_peso || "Não informado")}
                      onChange={e => setModal(m => m ? { ...m, pesoEditavel: e.target.value } : m)}
                      readOnly={!modal.editandoPeso}
                      rows={2}
                      style={{ 
                        resize: "vertical", 
                        fontFamily: "inherit", 
                        fontSize: 13, 
                        lineHeight: 1.6, 
                        background: modal.editandoPeso ? "var(--bg1)" : "var(--bg3)", 
                        cursor: modal.editandoPeso ? "text" : "not-allowed",
                        flex: 1
                      }}
                    />
                    {!modal.editandoPeso ? (
                      <button
                        className="btn btn-secondary"
                        onClick={() => setModal(m => m ? { ...m, editandoPeso: true } : m)}
                        style={{ padding: "0.5rem 1rem" }}
                      >
                        ✏️
                      </button>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => salvarCampo('peso', modal.pesoEditavel)}
                          disabled={modal.salvando}
                          style={{ padding: "0.5rem 1rem" }}
                        >
                          ✅
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setModal(m => m ? { ...m, editandoPeso: false, pesoEditavel: modal.produto.descricao_peso || "" } : m)}
                          style={{ padding: "0.5rem 1rem" }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase" }}>
                    📐 Tamanho / Dimensões
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                    <textarea
                      className="input"
                      value={modal.editandoTamanho ? modal.tamanhoEditavel : (modal.produto.descricao_tamanho || "Não informado")}
                      onChange={e => setModal(m => m ? { ...m, tamanhoEditavel: e.target.value } : m)}
                      readOnly={!modal.editandoTamanho}
                      rows={2}
                      style={{ 
                        resize: "vertical", 
                        fontFamily: "inherit", 
                        fontSize: 13, 
                        lineHeight: 1.6, 
                        background: modal.editandoTamanho ? "var(--bg1)" : "var(--bg3)", 
                        cursor: modal.editandoTamanho ? "text" : "not-allowed",
                        flex: 1
                      }}
                    />
                    {!modal.editandoTamanho ? (
                      <button
                        className="btn btn-secondary"
                        onClick={() => setModal(m => m ? { ...m, editandoTamanho: true } : m)}
                        style={{ padding: "0.5rem 1rem" }}
                      >
                        ✏️
                      </button>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => salvarCampo('tamanho', modal.tamanhoEditavel)}
                          disabled={modal.salvando}
                          style={{ padding: "0.5rem 1rem" }}
                        >
                          ✅
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setModal(m => m ? { ...m, editandoTamanho: false, tamanhoEditavel: modal.produto.descricao_tamanho || "" } : m)}
                          style={{ padding: "0.5rem 1rem" }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase" }}>
                    📄 Descrição (Contra Rótulo)
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                    <textarea
                      className="input"
                      value={modal.editandoDescricao ? modal.descricaoEditavel : (modal.produto.descricao || "Nenhuma descrição disponível")}
                      onChange={e => setModal(m => m ? { ...m, descricaoEditavel: e.target.value } : m)}
                      readOnly={!modal.editandoDescricao}
                      rows={4}
                      style={{ 
                        resize: "vertical", 
                        fontFamily: "inherit", 
                        fontSize: 13, 
                        lineHeight: 1.6, 
                        background: modal.editandoDescricao ? "var(--bg1)" : "var(--bg3)", 
                        cursor: modal.editandoDescricao ? "text" : "not-allowed",
                        flex: 1
                      }}
                    />
                    {!modal.editandoDescricao ? (
                      <button
                        className="btn btn-secondary"
                        onClick={() => setModal(m => m ? { ...m, editandoDescricao: true } : m)}
                        style={{ padding: "0.5rem 1rem" }}
                      >
                        ✏️
                      </button>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => salvarCampo('descricao', modal.descricaoEditavel)}
                          disabled={modal.salvando}
                          style={{ padding: "0.5rem 1rem" }}
                        >
                          ✅
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setModal(m => m ? { ...m, editandoDescricao: false, descricaoEditavel: modal.produto.descricao || "" } : m)}
                          style={{ padding: "0.5rem 1rem" }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase" }}>
                    🧪 Composição
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                    <textarea
                      className="input"
                      value={modal.editandoComposicao ? modal.composicaoEditavel : (modal.produto.descricao_composicao || "Não informado")}
                      onChange={e => setModal(m => m ? { ...m, composicaoEditavel: e.target.value } : m)}
                      readOnly={!modal.editandoComposicao}
                      rows={4}
                      style={{ 
                        resize: "vertical", 
                        fontFamily: "inherit", 
                        fontSize: 13, 
                        lineHeight: 1.6, 
                        background: modal.editandoComposicao ? "var(--bg1)" : "var(--bg3)", 
                        cursor: modal.editandoComposicao ? "text" : "not-allowed",
                        flex: 1
                      }}
                    />
                    {!modal.editandoComposicao ? (
                      <button
                        className="btn btn-secondary"
                        onClick={() => setModal(m => m ? { ...m, editandoComposicao: true } : m)}
                        style={{ padding: "0.5rem 1rem" }}
                      >
                        ✏️
                      </button>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => salvarCampo('composicao', modal.composicaoEditavel)}
                          disabled={modal.salvando}
                          style={{ padding: "0.5rem 1rem" }}
                        >
                          ✅
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setModal(m => m ? { ...m, editandoComposicao: false, composicaoEditavel: modal.produto.descricao_composicao || "" } : m)}
                          style={{ padding: "0.5rem 1rem" }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload de Thumbnail */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase" }}>
                    📸 Thumbnail (Capa)
                  </label>
                  <input
                    type="file"
                    id="upload-thumb-produto"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={handleThumbUpload}
                  />
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => document.getElementById('upload-thumb-produto')?.click()}
                      style={{ flex: 1 }}
                    >
                      {modal.produto.tem_thumb ? "🔄 Alterar Thumbnail" : "➕ Adicionar Thumbnail"}
                    </button>
                    {modal.produto.tem_thumb && (
                      <button
                        className="btn btn-secondary"
                        onClick={deletarThumb}
                        style={{ padding: "0.5rem 1rem", background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}
                      >
                        🗑️ Deletar
                      </button>
                    )}
                  </div>
                </div>

                {/* Carrossel */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase" }}>
                    🎠 Imagens do Carrossel ({modal.produto.imagens_carrossel.length})
                  </label>

                  {modal.produto.imagens_carrossel.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      {modal.produto.imagens_carrossel.map((img, idx) => (
                        <div key={idx} style={{ position: "relative", aspectRatio: "1", background: "var(--bg3)", borderRadius: 8, overflow: "hidden" }}>
                          <img
                            src={`${API}/api/catalogo/imagem/${MARCA_PADRAO}/produtos/${encodeURIComponent(modal.produto.nome.replace(/[<>:"/\\|?*]/g, '').trim())}/${img}?t=${Date.now()}`}
                            alt={`Imagem ${idx + 1}`}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                          <button
                            onClick={() => deletarImagemCarrossel(img)}
                            style={{
                              position: "absolute", top: 4, right: 4,
                              background: "rgba(0,0,0,0.7)", border: "none",
                              color: "white", borderRadius: 4, padding: "4px 8px",
                              cursor: "pointer", fontSize: 12
                            }}
                          >
                            🗑️
                          </button>
                          <div style={{
                            position: "absolute", bottom: 4, left: 4,
                            background: "rgba(0,0,0,0.6)", color: "white",
                            padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700
                          }}>
                            {idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    type="file"
                    id="upload-carrossel-produto"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    style={{ display: "none" }}
                    onChange={handleCarrosselUpload}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => document.getElementById('upload-carrossel-produto')?.click()}
                    style={{ width: "100%" }}
                  >
                    ➕ Adicionar Imagens ao Carrossel
                  </button>
                  <p style={{ fontSize: 11, color: "var(--text2)", fontStyle: "italic", margin: 0 }}>
                    💡 Você pode selecionar múltiplas imagens de uma vez
                  </p>
                </div>

                <p style={{ fontSize: 11, color: "var(--text2)", fontStyle: "italic", margin: 0, paddingTop: "0.5rem", borderTop: "1px solid var(--border)" }}>
                  💡 Todos os campos podem ser editados diretamente acima. Clique no botão ✏️ ao lado de cada campo.
                </p>

              </div>
            </div>

            {/* Footer do modal */}
            <div style={{
              padding: "1rem 1.5rem",
              borderTop: "1px solid var(--border)",
              display: "flex", justifyContent: "flex-end",
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

function ProdutoCard({ produto, onClick }: { produto: Produto; onClick: () => void }) {
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
        position: "relative"
      }}>
        {produto.tem_thumb && !imgErro ? (
          <img
            src={`${API}/api/catalogo/imagem/${MARCA_PADRAO}/produtos/${encodeURIComponent(produto.nome.replace(/[<>:"/\\|?*]/g, '').trim())}/thumb.${produto.thumb_ext}`}
            alt={produto.nome}
            onError={() => setImgErro(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ fontSize: 40, opacity: 0.3 }}>📦</span>
        )}
        {produto.imagens_carrossel.length > 0 && (
          <div style={{
            position: "absolute", top: 8, right: 8,
            background: "rgba(0,0,0,0.7)", color: "white",
            padding: "4px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700
          }}>
            🎠 {produto.imagens_carrossel.length}
          </div>
        )}
      </div>

      {/* Info do card */}
      <div style={{ padding: "0.875rem 1rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", lineHeight: 1.3, margin: 0, flex: 1 }}>
            {produto.nome}
          </h3>
          {produto.sku && (
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
              {produto.sku}
            </span>
          )}
        </div>

        {produto.preco > 0 && (
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--primary)" }}>
            R$ {produto.preco.toFixed(2)}
          </span>
        )}

        {produto.descricao && (
          <p style={{
            fontSize: 11, color: "var(--text2)", lineHeight: 1.5,
            margin: 0, overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          } as React.CSSProperties}>
            {produto.descricao}
          </p>
        )}

        {!produto.preco && !produto.descricao && (
          <span style={{ fontSize: 11, color: "var(--border)", fontStyle: "italic" }}>
            Clique para ver detalhes
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
