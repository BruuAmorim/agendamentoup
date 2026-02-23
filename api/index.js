// api/index.js - Entry point para Vercel Serverless Functions
// Este arquivo exporta o app Express para funcionar no Vercel

// Definir VERCEL antes de importar o server para evitar app.listen()
process.env.VERCEL = '1';

// Importar o app Express (já configurado no backend/server.js)
let app;

try {
  app = require('../backend/server');
  console.log('✅ App Express carregado com sucesso');
} catch (error) {
  console.error('❌ Erro ao carregar app:', error);
  console.error('❌ Stack:', error.stack);
  // Exportar handler de erro caso o app não carregue
  module.exports = (req, res) => {
    console.error('❌ Handler de erro sendo usado');
    res.status(500).json({
      error: 'Erro ao inicializar aplicação',
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  };
}

// Handler para Vercel Serverless Functions
// O Vercel automaticamente detecta funções na pasta api/
// Quando usamos rewrites, todas as rotas são redirecionadas para aqui
module.exports = (req, res) => {
  // Log sempre para debug
  console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.url} (original: ${req.originalUrl || req.url})`);
  
  // Se o app não carregou, retornar erro
  if (!app) {
    console.error('❌ App não está disponível');
    return res.status(500).json({
      error: 'Aplicação não inicializada',
      message: 'O servidor não foi inicializado corretamente'
    });
  }
  
  try {
    // Ajustar o path se necessário
    // Se a requisição for para a raiz (/), manter como está
    if (req.url === '/' || req.url === '') {
      req.url = '/';
      req.originalUrl = req.originalUrl || '/';
    } else if (!req.url.startsWith('/api') && !req.url.startsWith('/')) {
      // Garantir que comece com /
      req.url = '/' + req.url;
    } else if (!req.url.startsWith('/api') && req.url !== '/') {
      // Se não começa com /api e não é /, adicionar /api
      const path = req.url.startsWith('/') ? req.url : '/' + req.url;
      req.url = '/api' + path;
      req.originalUrl = '/api' + (req.originalUrl && req.originalUrl.startsWith('/') ? req.originalUrl : '/' + (req.originalUrl || req.url));
      console.log(`🔧 Path ajustado: ${path} → ${req.url}`);
    }
    
    // Chamar o app Express
    return app(req, res);
  } catch (error) {
    console.error('❌ Erro no handler:', error);
    console.error('❌ Stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }
};

