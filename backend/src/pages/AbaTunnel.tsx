import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface RenderConfig {
  api_key: string;
  service_id: string;
  env_var_name: string;
}

export default function AbaTunnel() {
  const [tunnelUrl, setTunnelUrl] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  // Configuração do Render
  const [apiKey, setApiKey] = useState('');
  const [serviceId, setServiceId] = useState('');
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

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

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

  const loadRenderConfig = async () => {
    try {
      const config = await invoke<RenderConfig | null>('load_render_config');
      if (config) {
        setApiKey(config.api_key);
        setServiceId(config.service_id);
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
    if (!apiKey.trim() || !serviceId.trim()) {
      showMessage('error', '⚠️ Preencha API Key e Service ID primeiro');
      return;
    }

    setTestingConnection(true);
    try {
      const result = await invoke<string>('test_render_connection', {
        apiKey: apiKey.trim(),
        serviceId: serviceId.trim(),
      });
      showMessage('success', result);
    } catch (error) {
      showMessage('error', String(error));
    } finally {
      setTestingConnection(false);
    }
  };

  const saveConfig = async () => {
    if (!apiKey.trim() || !serviceId.trim() || !envVarName.trim()) {
      showMessage('error', '⚠️ Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const result = await invoke<string>('save_render_config', {
        apiKey: apiKey.trim(),
        serviceId: serviceId.trim(),
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

  const updateRenderEnv = async () => {
    if (!tunnelUrl) {
      showMessage('error', '⚠️ URL do Cloudflare ainda não foi detectada');
      return;
    }

    if (!isConfigured) {
      showMessage('error', '⚠️ Configure o Render primeiro');
      setShowConfig(true);
      return;
    }

    setLoading(true);
    try {
      const result = await invoke<string>('update_render_env');
      showMessage('success', result);
    } catch (error) {
      showMessage('error', String(error));
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
              disabled={loading || !isConfigured}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: loading ? '#666' : isConfigured ? '#28a745' : '#666',
                color: '#fff',
                cursor: loading || !isConfigured ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '16px'
              }}
            >
              {loading ? '⏳ Atualizando...' : '🔄 Atualizar URL no Render.com'}
            </button>

            {!isConfigured && (
              <p style={{ marginTop: '12px', color: '#ffc107', fontSize: '14px' }}>
                ⚠️ Configure o Render primeiro para ativar este botão
              </p>
            )}
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
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#666' }}>
              A URL aparecerá automaticamente quando o tunnel estiver ativo
            </p>
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
              <label style={{ display: 'block', marginBottom: '8px', color: '#ccc', fontSize: '14px' }}>
                Service ID:
              </label>
              <input
                type="text"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                placeholder="srv-xxxxxxxxxxxxx"
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
                Encontre na URL do seu serviço: dashboard.render.com/web/<strong>srv-xxx</strong>
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
