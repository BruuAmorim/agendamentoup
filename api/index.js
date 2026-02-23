// api/index.js - Entry point para Vercel Serverless Functions
// Este arquivo exporta o app Express para funcionar no Vercel

// Definir VERCEL antes de importar o server para evitar app.listen()
process.env.VERCEL = '1';

// Importar o app Express diretamente
// O backend/server.js já exporta o app quando VERCEL está definido
const app = require('../backend/server');

// O Vercel automaticamente detecta funções na pasta api/
// Quando uma requisição chega via rewrite, o path pode estar sem o /api
// Criar um wrapper que ajusta o path antes de passar para o Express
module.exports = (req, res) => {
  // Log para debug
  console.log(`📥 ${req.method} ${req.url}`);
  
  // Ajustar o path se necessário
  const originalUrl = req.url;
  
  // Se for a raiz, manter como está (já temos rota GET /)
  if (originalUrl === '/' || originalUrl === '') {
    // Manter como está
  } else if (!originalUrl.startsWith('/api')) {
    // Adicionar /api ao início
    const path = originalUrl.startsWith('/') ? originalUrl : '/' + originalUrl;
    req.url = '/api' + path;
    req.originalUrl = '/api' + (req.originalUrl && req.originalUrl.startsWith('/') ? req.originalUrl : '/' + (req.originalUrl || originalUrl));
    console.log(`🔧 Path ajustado: ${originalUrl} → ${req.url}`);
  }
  
  // Chamar o app Express
  return app(req, res);
};

