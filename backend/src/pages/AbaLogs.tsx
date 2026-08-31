import { useEffect, useState, useRef } from "react";
import { API_BASE_URL } from "../config";

interface LogEntry {
  timestamp: string;
  level: "Info" | "Warn" | "Error" | "Debug";
  module: string;
  message: string;
  source: string; // "frontend" | "backend"
}

const API = API_BASE_URL;

const LEVEL_CLASS: Record<string, string> = {
  Error: "log-error",
  Warn:  "log-warn",
  Info:  "log-info",
  Debug: "log-debug",
};

const BADGE_CLASS: Record<string, string> = {
  Error: "badge badge-danger",
  Warn:  "badge badge-warning",
  Info:  "badge badge-info",
  Debug: "badge badge-gray",
};

const SOURCE_BADGE: Record<string, string> = {
  frontend: "badge badge-primary",
  backend: "badge badge-success",
};

// Intercepta console.log/error/warn do frontend e envia para o backend
function setupConsoleInterception() {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args: any[]) => {
    originalLog(...args);
    sendLogToBackend("Info", "Frontend", args.join(" "));
  };

  console.error = (...args: any[]) => {
    originalError(...args);
    sendLogToBackend("Error", "Frontend", args.join(" "));
  };

  console.warn = (...args: any[]) => {
    originalWarn(...args);
    sendLogToBackend("Warn", "Frontend", args.join(" "));
  };
}

async function sendLogToBackend(level: string, module: string, message: string) {
  try {
    await fetch(`${API}/api/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, module, message }),
    });
  } catch {
    // Silencioso - não queremos criar loop de erros
  }
}

export default function AbaLogs() {
  const [logs, setLogs]         = useState<LogEntry[]>([]);
  const [filtro, setFiltro]     = useState("");
  const [nivel, setNivel]       = useState("");
  const [fonte, setFonte]       = useState(""); // novo filtro
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  async function fetchLogs() {
    try {
      const res = await fetch(`${API}/api/logs`);
      const json = await res.json();
      setLogs(json.logs || []);
    } catch {}
  }

  useEffect(() => {
    // Setup console interception apenas uma vez
    setupConsoleInterception();
    
    fetchLogs();
    intervalRef.current = window.setInterval(fetchLogs, 1000); // atualiza a cada 1s para tempo real
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  // Detecta scroll manual e desativa auto-scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
    
    // Se não está no final, desativa auto-scroll
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    }
    // Se chegou no final, reativa auto-scroll
    else if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    }
  };

  const filtrados = logs.filter(l => {
    if (nivel && l.level !== nivel) return false;
    if (fonte && l.source !== fonte) return false;
    if (filtro && !JSON.stringify(l).toLowerCase().includes(filtro.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      {/* Toolbar */}
      <div className="toolbar">
        <input
          className="input"
          placeholder="Filtrar logs..."
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          style={{ width: 200 }}
        />

        <select
          className="input"
          value={nivel}
          onChange={e => setNivel(e.target.value)}
          style={{ width: 110 }}
        >
          <option value="">Todos níveis</option>
          <option value="Error">Error</option>
          <option value="Warn">Warn</option>
          <option value="Info">Info</option>
          <option value="Debug">Debug</option>
        </select>

        <select
          className="input"
          value={fonte}
          onChange={e => setFonte(e.target.value)}
          style={{ width: 120 }}
        >
          <option value="">Todas fontes</option>
          <option value="frontend">Frontend</option>
          <option value="backend">Backend</option>
        </select>

        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
          fontSize: 12, color: autoScroll ? "var(--success)" : "var(--text2)" }}>
          <input type="checkbox" checked={autoScroll}
            onChange={e => setAutoScroll(e.target.checked)}
            style={{ accentColor: "var(--success)" }} />
          Auto-scroll
        </label>

        <button className="btn btn-secondary" onClick={() => setLogs([])}>
          🗑 Limpar
        </button>

        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text2)" }}>
          {filtrados.length} / {logs.length} entradas
        </span>
      </div>

      {/* Tabela de logs */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="table-container" 
        style={{ fontFamily: "var(--mono)", fontSize: 11 }}
      >
        <table>
          <thead>
            <tr>
              <th style={{ width: 100 }}>Horário</th>
              <th style={{ width: 80  }}>Fonte</th>
              <th style={{ width: 70  }}>Nível</th>
              <th style={{ width: 110 }}>Módulo</th>
              <th>Mensagem</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: "3rem", color: "var(--text2)" }}>
                Nenhum log ainda...
              </td></tr>
            ) : (
              filtrados.map((l, i) => (
                <tr key={i} className={LEVEL_CLASS[l.level] || ""}>
                  <td style={{ color: "var(--text2)", whiteSpace: "nowrap" }}>{l.timestamp}</td>
                  <td><span className={SOURCE_BADGE[l.source] || "badge badge-gray"}>{l.source}</span></td>
                  <td><span className={BADGE_CLASS[l.level] || "badge badge-gray"}>{l.level}</span></td>
                  <td style={{ color: "var(--info)" }}>{l.module}</td>
                  <td style={{ wordBreak: "break-word" }}>{l.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div ref={bottomRef} />
      </div>
    </>
  );
}
