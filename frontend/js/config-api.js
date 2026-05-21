/**
 * Configuração da API para Aevum
 *
 * Este arquivo centraliza a configuração da URL da API,
 * detectando automaticamente se está em desenvolvimento ou produção.
 */

// Configurações de ambiente
const API_CONFIG = {
  // Detectar se está em produção baseado na origem
  isProduction: () => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // Não é produção se estiver em localhost ou 127.0.0.1
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return false;
    }

    // Não é produção se estiver usando HTTP (exceto se for localhost)
    if (protocol === 'http:' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return false;
    }

    // Considerar produção se usar HTTPS ou domínios comuns de produção
    return protocol === 'https:' || !hostname.includes('localhost');
  },

  // IP da rede local? (192.168.x.x, 10.x.x.x, 172.16–31.x.x)
  isPrivateNetwork: (hostname) => {
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (/^192\.168\.\d+\.\d+$/.test(hostname)) return true;
    if (/^10\.\d+\.\d+\.\d+$/.test(hostname)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)) return true;
    return false;
  },

  // Obter URL base da API
  getBaseUrl: () => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isPrivate = API_CONFIG.isPrivateNetwork(hostname);

    // Localhost ou IP da rede: usar backend no mesmo host, porta 3000 (teste local sem deploy)
    if (isLocalhost || isPrivate) {
      const localApi = `http://${hostname}:3000/api`;
      console.log('🔧 Ambiente local/rede - usando API:', localApi);
      return localApi;
    }

    // Produção: backend no Vercel (Firebase Hosting não tem proxy para /api)
    return 'https://cloudd-agenda-backend.vercel.app/api';
  },

  // Configurações de timeout e retry
  timeout: 10000, // 10 segundos
  retryAttempts: 3,
  retryDelay: 1000, // 1 segundo

  // Configurações específicas do ambiente
  environment: {
    name: () => API_CONFIG.isProduction() ? 'production' : 'development',
    debug: () => !API_CONFIG.isProduction(),
    corsEnabled: true
  }
};

// URL base da API (calculada dinamicamente)
API_CONFIG.baseUrl = API_CONFIG.getBaseUrl();

// Função para testar conectividade com a API
API_CONFIG.testConnection = async () => {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl.replace('/api', '')}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      // Timeout para evitar travamentos
      signal: AbortSignal.timeout(API_CONFIG.timeout)
    });

    return {
      success: response.ok,
      status: response.status,
      url: API_CONFIG.baseUrl
    };
  } catch (error) {
    console.warn('Falha ao testar conexão com API:', error.message);
    return {
      success: false,
      error: error.message,
      url: API_CONFIG.baseUrl
    };
  }
};

// Função para obter informações de debug
API_CONFIG.getDebugInfo = () => {
  return {
    isProduction: API_CONFIG.isProduction(),
    environment: API_CONFIG.environment.name(),
    apiUrl: API_CONFIG.baseUrl,
    origin: window.location.origin,
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    timestamp: new Date().toISOString()
  };
};

// Log de inicialização (apenas em desenvolvimento)
if (API_CONFIG.environment.debug()) {
  console.log('🔧 API Config Debug:', API_CONFIG.getDebugInfo());
}

// Exportar configurações
window.API_CONFIG = API_CONFIG;
