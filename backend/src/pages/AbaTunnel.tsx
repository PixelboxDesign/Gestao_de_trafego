import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface RenderConfig {
  api_key: string;
  service_ids: string[]; // ← MUDOU: array de service IDs
  env_var_name: string;
}

interface ServiceIdItem {
  id: string;
  name: string; // Nome amigável (opcional)
}

export default function AbaTunnel() {
  const [tunnelUrl, setTunnelUrl] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  // Configuração do Render
  const [apiKey, setApiKey] = useState('');
  const [serviceIds, setServiceIds] = useState<ServiceIdItem[]>([{ id: '', name: '' }]); // ← MUDOU: array
  const [envVarName, setEnvVarName] = useState('VITE_API_BASE_URL');
  
  // Estados de carregamento e mensagens
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    // Carregar URL do tunnel ao montar
    loadTunnelUrl();
    
    // Carregar configuração do Render
    loadRenderConfig();
    
    // Escutar eventos de nova URL detectada
    const unlisten = listen<string>('tunnel-url-detected', (event) => {
      setTunnelUrl(event.payload);
      showMessage('success', '🌐 Nova URL do Cloudflare detectada!');
    });

    // Fallback: tentar buscar URL manualmente a cada 5 segundos se não detectou
    const interval = setInterval(async () => {
      if (!tunnelUrl) {
        try {
          const url = await invoke<string | null>('fetch_cloudflare_url_manual');
          if (url) {
            setTunnelUrl(url);
            showMessage('success', '🌐 URL do Cloudflare detectada (fallback)!');
            clearInterval(interval);
          }
        } catch (error) {
          // Silencioso - não precisa logar erro
        }
      }
    }, 5000);

    return () => {
      unlisten.then(fn => fn());
      clearInterval(interval);
    };
  }, [tunnelUrl]);

  const loadTunnelUrl = async () => {
    try {
      const url = await invoke<string | null>('get_tunnel_url');
      if (url) {
        setTunnelUrl(url);
      }
    } catch (error) {
      console.error('Erro ao carregar URL:', error);
    }
  };

  const forceReloadUrl = async () => {
    setLoading(true);
    try {
      // Tenta reiniciar o tunnel completamente
      showMessage('info', '🔄 Reiniciando Cloudflare Tunnel... (aguarde até 30s)');
      
      const result = await invoke<string>('restart_cloudflare_tunnel');
      
      // Aguarda 2s e recarrega URL
      await new Promise(resolve => setTimeout(resolve, 2000));
      const url = await invoke<string | null>('get_tunnel_url');
      
      if (url) {
        setTunnelUrl(url);
        showMessage('success', `✅ ${result}`);
      } else {
        showMessage('error', '⚠️ Tunnel reiniciado mas URL ainda não apareceu. Aguarde mais alguns segundos.');
      }
    } catch (error) {
      showMessage('error', String(error));
    } finally {
      setLoading(false);
    }
  };

  const loadRenderConfig = async () => {
    try {
      const config = await invoke<RenderConfig | null>('load_render_config');
      if (config) {
        setApiKey(config.api_key);
        
        // Converte array de strings para array de ServiceIdItem
        if (config.service_ids && config.service_ids.length > 0) {
          setServiceIds(config.service_ids.map((id, index) => ({
            id,
            name: `Serviço ${index + 1}`
          })));
        }
        
        setEnvVarName(config.env_var_name);
        setIsConfigured(true);
      }
    } catch (error) {
      console.error('Erro ao carregar config:', error);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(tunnelUrl);
      showMessage('success', '✅ URL copiada para a área de transferência!');
    } catch (error) {
      showMessage('error', '❌ Erro ao copiar URL');
    }
  };

  const testConnection = async () => {
    const validIds = serviceIds.filter(s => s.id.trim()).map(s => s.id.trim());
    
    if (!apiKey.trim() || validIds.length === 0) {
      showMessage('error', '⚠️ Preencha API Key e pelo menos um Service ID');
      return;
    }

    setTestingConnection(true);
    try {
      // Testa todos os Service IDs
      const results = await Promise.allSettled(
        validIds.map(id => 
          invoke<string>('test_render_connection', {
            apiKey: apiKey.trim(),
            serviceId: id,
          })
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      if (failCount === 0) {
        showMessage('success', `✅ Todos os ${successCount} serviços testados com sucesso!`);
      } else {
        showMessage('error', `⚠️ ${successCount} OK, ${failCount} com erro. Verifique os Service IDs.`);
      }
    } catch (error) {
      showMessage('error', String(error));
    } finally {
      setTestingConnection(false);
    }
  };

  const saveConfig = async () => {
    const validIds = serviceIds.filter(s => s.id.trim()).map(s => s.id.trim());
    
    if (!apiKey.trim() || validIds.length === 0 || !envVarName.trim()) {
      showMessage('error', '⚠️ Preencha API Key e pelo menos um Service ID');
      return;
    }

    setLoading(true);
    try {
      const result = await invoke<string>('save_render_config', {
        apiKey: apiKey.trim(),
        serviceIds: validIds, // ← Agora envia array
        envVarName: envVarName.trim(),
      });
      showMessage('success', result);
      setIsConfigured(true);
      setShowConfig(false);
    } catch (error) {
      showMessage('error', String(error));
    } finally {
      setLoading(false);
    }
  };

  // Funções para gerenciar Service IDs
  const addServiceId = () => {
    setServiceIds([...serviceIds, { id: '', name: '' }]);
  };

  const removeServiceId = (index: number) => {
    if (serviceIds.length > 1) {
      setServiceIds(serviceIds.filter((_, i) => i !== index));
    }
  };

  const updateServiceId = (index: number, field: 'id' | 'name', value: string) => {
    const newIds = [...serviceIds];
    newIds[index][field] = value;
    setServiceIds(newIds);
  };

  const updateRenderEnv = async () => {
    if (!tunnelUrl) {
      showMessage('error', '⚠️ URL do Cloudflare ainda não foi detectada');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/render/deploy-com-url-nova', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const result = await response.json();
      showMessage('success', result.mensagem + '\n\n🌐 Acesse: https://luna-disparo.onrender.com');
    } catch (error) {
      showMessage('error', '❌ Erro: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h2>🌐 Cloudflare Tunnel Manager</h2>
      
      {/* Mensagem de feedback */}
      {message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          backgroundColor: message.type === 'success' ? '#d4edda' : message.type === 'error' ? '#f8d7da' : '#d1ecf1',
          color: message.type === 'success' ? '#155724' : message.type === 'error' ? '#721c24' : '#0c5460',
          border: `1px solid ${message.type === 'success' ? '#c3e6cb' : message.type === 'error' ? '#f5c6cb' : '#bee5eb'}`,
          whiteSpace: 'pre-line'
        }}>
          {message.text}
        </div>
      )}

      {/* Card da URL do Cloudflare */}
      <div style={{
        backgroundColor: '#1a1a2e',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '24px',
        border: '1px solid #2a2a3e'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#fff' }}>
          URL do Cloudflare Tunnel
        </h3>
        
        {tunnelUrl ? (
          <>
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <input
                type="text"
                value={tunnelUrl}
                readOnly
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #3a3a4e',
                  backgroundColor: '#0f0f1e',
                  color: '#fff',
                  fontSize: '14px',
                  fontFamily: 'monospace'
                }}
              />
              <button
                onClick={copyToClipboard}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#4a9eff',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                📋 Copiar
              </button>
            </div>

            <button
              onClick={updateRenderEnv}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: loading ? '#666' : '#28a745',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '16px'
              }}
            >
              {loading ? '⏳ Atualizando...' : '🔄 Atualizar URL no Render.com'}
            </button>
          </>
        ) : (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: '#888',
            backgroundColor: '#0f0f1e',
            borderRadius: '8px',
            border: '1px dashed #3a3a4e'
          }}>
            <p style={{ margin: 0, fontSize: '16px' }}>
              ⏳ Aguardando Cloudflare Tunnel iniciar...
            </p>
            <p style={{ margin: '8px 0 16px 0', fontSize: '14px', color: '#666' }}>
              A URL aparecerá automaticamente quando o tunnel estiver ativo
            </p>
            <button
              onClick={forceReloadUrl}
              disabled={loading}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid #4a9eff',
                backgroundColor: loading ? '#666' : 'transparent',
                color: loading ? '#aaa' : '#4a9eff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              {loading ? '⏳ Buscando...' : '🔄 Recarregar URL Manualmente'}
            </button>
          </div>
        )}
      </div>

      {/* Card de Configuração do Render */}
      <div style={{
        backgroundColor: '#1a1a2e',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid #2a2a3e'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#fff' }}>
            Configuração do Render.com {isConfigured && '✅'}
          </h3>
          <button
            onClick={() => setShowConfig(!showConfig)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #4a9eff',
              backgroundColor: 'transparent',
              color: '#4a9eff',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {showConfig ? '▼ Ocultar' : '▶ Mostrar'}
          </button>
        </div>

        {showConfig && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#ccc', fontSize: '14px' }}>
                API Key do Render:
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="rnd_xxxxxxxxxxxx"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #3a3a4e',
                  backgroundColor: '#0f0f1e',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
              <small style={{ color: '#888', fontSize: '12px' }}>
                Obtenha em: <a href="https://dashboard.render.com/u/settings/api-keys" target="_blank" style={{ color: '#4a9eff' }}>dashboard.render.com/u/settings/api-keys</a>
              </small>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ color: '#ccc', fontSize: '14px', fontWeight: 'bold' }}>
                  Service IDs: ({serviceIds.filter(s => s.id.trim()).length})
                </label>
                <button
                  onClick={addServiceId}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#28a745',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  ➕ Adicionar Serviço
                </button>
              </div>

              {serviceIds.map((service, index) => (
                <div key={index} style={{
                  marginBottom: '12px',
                  padding: '16px',
                  backgroundColor: '#0f0f1e',
                  borderRadius: '8px',
                  border: '1px solid #2a2a3e'
                }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      value={service.name}
                      onChange={(e) => updateServiceId(index, 'name', e.target.value)}
                      placeholder="Nome (opcional)"
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #3a3a4e',
                        backgroundColor: '#1a1a2e',
                        color: '#fff',
                        fontSize: '13px'
                      }}
                    />
                    {serviceIds.length > 1 && (
                      <button
                        onClick={() => removeServiceId(index)}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#dc3545',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={service.id}
                    onChange={(e) => updateServiceId(index, 'id', e.target.value)}
                    placeholder="srv-xxxxxxxxxxxxx"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #3a3a4e',
                      backgroundColor: '#1a1a2e',
                      color: '#fff',
                      fontSize: '13px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              ))}
              
              <small style={{ color: '#888', fontSize: '12px', display: 'block', marginTop: '8px' }}>
                💡 Adicione múltiplos Service IDs para deployar em vários serviços de uma vez<br />
                Encontre na URL: dashboard.render.com/web/<strong>srv-xxx</strong>
              </small>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#ccc', fontSize: '14px' }}>
                Nome da Variável de Ambiente:
              </label>
              <input
                type="text"
                value={envVarName}
                onChange={(e) => setEnvVarName(e.target.value)}
                placeholder="VITE_API_BASE_URL"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #3a3a4e',
                  backgroundColor: '#0f0f1e',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
              <small style={{ color: '#888', fontSize: '12px' }}>
                Qual variável no Render deve receber a URL do Cloudflare
              </small>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={testConnection}
                disabled={testingConnection}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ffc107',
                  backgroundColor: 'transparent',
                  color: '#ffc107',
                  cursor: testingConnection ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {testingConnection ? '⏳ Testando...' : '🧪 Testar Conexão'}
              </button>

              <button
                onClick={saveConfig}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: loading ? '#666' : '#28a745',
                  color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {loading ? '⏳ Salvando...' : '💾 Salvar Configuração'}
              </button>
            </div>
          </>
        )}

        {isConfigured && !showConfig && (
          <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>
            ✅ Configuração salva. Clique em "Mostrar" para editar.
          </p>
        )}
      </div>

      {/* Instruções */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        backgroundColor: '#0f0f1e',
        borderRadius: '8px',
        border: '1px solid #2a2a3e'
      }}>
        <h4 style={{ marginTop: 0, color: '#4a9eff' }}>📖 Como usar:</h4>
        <ol style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.8' }}>
          <li>Aguarde o Cloudflare Tunnel iniciar (URL aparecerá automaticamente)</li>
          <li>Configure suas credenciais do Render.com (apenas uma vez)</li>
          <li>Clique em "Atualizar URL no Render.com" sempre que o tunnel reiniciar</li>
          <li>O Render fará deploy automático em ~2 minutos</li>
        </ol>
      </div>
    </div>
  );
}
