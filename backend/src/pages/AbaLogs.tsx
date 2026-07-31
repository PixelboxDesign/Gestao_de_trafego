import { useEffect, useState, useRef } from "react";

interface LogEntry {
  timestamp: string;
  level: "Info" | "Warn" | "Error" | "Debug";
  module: string;
  message: string;
}

const API = "http://localhost:3001";

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

export default function AbaLogs() {
  const [logs, setLogs]         = useState<LogEntry[]>([]);
  const [filtro, setFiltro]     = useState("");
  const [nivel, setNivel]       = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);

  async function fetchLogs() {
    try {
      const res = await fetch(`${API}/api/logs`);
      const json = await res.json();
      setLogs(json.logs || []);
    } catch {}
  }

  useEffect(() => {
    fetchLogs();
    intervalRef.current = window.setInterval(fetchLogs, 2000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const filtrados = logs.filter(l => {
    if (nivel && l.level !== nivel) return false;
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
          <option value="">Todos</option>
          <option value="Error">Error</option>
          <option value="Warn">Warn</option>
          <option value="Info">Info</option>
          <option value="Debug">Debug</option>
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
      <div className="table-container" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 130 }}>Horário</th>
              <th style={{ width: 70  }}>Nível</th>
              <th style={{ width: 110 }}>Módulo</th>
              <th>Mensagem</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: "center", padding: "3rem", color: "var(--text2)" }}>
                Nenhum log ainda...
              </td></tr>
            ) : (
              filtrados.map((l, i) => (
                <tr key={i} className={LEVEL_CLASS[l.level] || ""}>
                  <td style={{ color: "var(--text2)", whiteSpace: "nowrap" }}>{l.timestamp}</td>
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
