/**
 * Configurações da API - EvAgendamento (BACKEND)
 */

const getApiBaseUrl = () => {
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }

  if (process.env.NODE_ENV === 'production') {
    const host = process.env.API_HOST || 'localhost';
    const port = process.env.PORT || 3000;
    const protocol = process.env.API_PROTOCOL || 'http';

    return `${protocol}://${host}:${port}/api`;
  }

  return `http://localhost:${process.env.PORT || 3000}/api`;
};

const API_BASE_URL = getApiBaseUrl();

const API_CONFIG = {
  baseUrl: API_BASE_URL,
  port: process.env.PORT || 3000,
  environment: process.env.NODE_ENV || 'development',

  // Endpoints SEM /api no início (o /api já está no baseUrl)
  endpoints: {
    health: '/health',

    auth: {
      login: '/auth/login',
      register: '/auth/register',
      refresh: '/auth/refresh'
    },

    users: {
      list: '/users',
      create: '/users',
      get: '/users/:id',
      update: '/users/:id',
      delete: '/users/:id'
    },

    appointments: {
      list: '/appointments',
      create: '/appointments',
      get: '/appointments/:id',
      availableSlots: '/appointments/available/:date'
    },

    slots: {
      available: '/slots/:date'
    },

    webhooks: {
      appointments: '/n8n/appointments'
    }
  },

  info: {
    name: 'Aevum API',
    version: '2.2.0'
  }
};

// Função auxiliar para gerar URLs completas
function getEndpointUrl(endpointPath, params = {}) {
  // Remove /api duplicado se por acaso for passado
  let cleanEndpoint = endpointPath.startsWith('/api/') 
    ? endpointPath.substring(4)
    : endpointPath;
    
  let url = `${API_CONFIG.baseUrl}${cleanEndpoint}`;

  // Substitui parâmetros dinâmicos
  Object.keys(params).forEach(key => {
    url = url.replace(`:${key}`, params[key]);
  });

  return url;
}

// Middleware para log de rotas (útil para debug)
function apiLogger(req, res, next) {
  console.log(`🌐 ${req.method} ${req.originalUrl} → ${req.path}`);
  next();
}

module.exports = {
  API_CONFIG,
  getEndpointUrl,
  apiLogger
};