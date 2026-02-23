// api/index.js - Entry point para Vercel Serverless Functions
// Este arquivo exporta o app Express para funcionar no Vercel

// Definir VERCEL antes de importar o server para evitar app.listen()
process.env.VERCEL = '1';

// Importar o app Express (já configurado no backend/server.js)
const app = require('../backend/server');

// Handler para Vercel Serverless Functions
// O Vercel roteia /api/* para api/index.js e remove o prefixo /api
// Então /api/health chega aqui como /health
// Precisamos restaurar o /api para que o Express encontre as rotas corretas
module.exports = (req, res) => {
  // Salvar o path original para debug
  const originalPath = req.url;
  
  // Restaurar o prefixo /api que o Vercel remove
  // Se a requisição for para a raiz (/), manter como está (já temos rota GET /)
  if (req.url === '/' || req.url === '') {
    // Manter como está - já temos rota GET / no Express
    req.url = '/';
    req.originalUrl = req.originalUrl || '/';
  } else if (!req.url.startsWith('/api')) {
    // Adicionar /api ao início do path
    const path = req.url.startsWith('/') ? req.url : '/' + req.url;
    req.url = '/api' + path;
    req.originalUrl = '/api' + (req.originalUrl.startsWith('/') ? req.originalUrl : '/' + req.originalUrl);
  }
  
  // Log para debug
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📥 ${req.method} ${originalPath} → ${req.url}`);
  }
  
  // Chamar o app Express (que já é um handler válido)
  return app(req, res);
};

