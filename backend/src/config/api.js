/**
 * Configuração da API (porta, versão, etc.)
 * Usado pelo server.js e compatível com Vercel (variáveis de ambiente).
 */

const API_CONFIG = {
  port: parseInt(process.env.PORT || '3000', 10),
  info: {
    version: process.env.API_VERSION || '1.0.0',
    name: 'Cloudd Agenda API'
  }
};

module.exports = {
  API_CONFIG
};
