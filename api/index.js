// api/index.js - Entry point para Vercel Serverless Functions
// Este arquivo exporta o app Express para funcionar no Vercel

// Definir VERCEL antes de importar o server
process.env.VERCEL = '1';

const app = require('../backend/server');

// O Vercel remove o prefixo /api quando roteia para api/index.js
// Então /api/health vira /health. Precisamos restaurar o /api
module.exports = (req, res) => {
  // Log para debug
  console.log('📥 Request recebido:', req.method, req.url, req.originalUrl);
  
  // Restaurar o prefixo /api que o Vercel remove
  if (!req.url.startsWith('/api')) {
    const originalPath = req.url.startsWith('/') ? req.url : '/' + req.url;
    req.url = '/api' + originalPath;
    if (req.originalUrl) {
      req.originalUrl = '/api' + (req.originalUrl.startsWith('/') ? req.originalUrl : '/' + req.originalUrl);
    }
    console.log('🔧 Path corrigido para:', req.url);
  }
  
  // Chamar o app Express
  return app(req, res);
};

