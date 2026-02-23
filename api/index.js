// api/index.js - Entry point para Vercel Serverless Functions
// O Vercel automaticamente detecta este arquivo e cria a rota /api

// Definir VERCEL antes de importar o server para evitar app.listen()
process.env.VERCEL = '1';

console.log('🔄 Carregando api/index.js...');

// Importar o app Express diretamente
// O backend/server.js já exporta o app quando VERCEL está definido
let app;

try {
  console.log('📦 Importando backend/server...');
  app = require('../backend/server');
  console.log('✅ App Express carregado com sucesso');
} catch (error) {
  console.error('❌ ERRO ao carregar app:', error);
  console.error('❌ Stack:', error.stack);
  // Exportar handler de erro
  module.exports = (req, res) => {
    console.error('❌ Handler de erro sendo usado');
    res.status(500).json({
      error: 'Erro ao inicializar aplicação',
      message: error.message
    });
  };
  throw error;
}

// Handler para Vercel Serverless Functions
// Quando o Vercel roteia para /api, ele remove o /api do path
// Então /api/health chega aqui como /health
// Precisamos restaurar o /api para que o Express encontre as rotas
module.exports = (req, res) => {
  // Log sempre para debug
  console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.url} (original: ${req.originalUrl || req.url})`);
  
  if (!app) {
    console.error('❌ App não está disponível!');
    return res.status(500).json({
      error: 'Aplicação não inicializada'
    });
  }
  
  try {
    // Ajustar o path
    const originalUrl = req.url || '/';
    
    // Se for a raiz, manter como está (já temos rota GET /)
    if (originalUrl === '/' || originalUrl === '') {
      req.url = '/';
      req.originalUrl = req.originalUrl || '/';
    } else if (!originalUrl.startsWith('/api')) {
      // Adicionar /api ao início
      const path = originalUrl.startsWith('/') ? originalUrl : '/' + originalUrl;
      req.url = '/api' + path;
      req.originalUrl = '/api' + (req.originalUrl && req.originalUrl.startsWith('/') ? req.originalUrl : '/' + (req.originalUrl || originalUrl));
      console.log(`🔧 Path ajustado: ${originalUrl} → ${req.url}`);
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

