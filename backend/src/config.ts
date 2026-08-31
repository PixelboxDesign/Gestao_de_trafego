// Configuração da API base URL
// Em produção (Render), usa a variável de ambiente
// Em desenvolvimento local (Tauri), usa localhost

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

console.log('[Config] API Base URL:', API_BASE_URL);
