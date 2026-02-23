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
  // Exportar handler de erro caso o app não carregue
  module.exports = (req, res) => {
    res.status(500).json({
      error: 'Erro ao inicializar aplicação',
      message: error.message
    });
  };
  throw error;
}

// Handler para Vercel Serverless Functions
// O Vercel roteia /api/* para api/index.js e remove o prefixo /api
// Então /api/health chega aqui como /health
// Precisamos restaurar o /api para que o Express encontre as rotas corretas
module.exports = (req, res) => {
  try {
    // Log para debug (sempre logar para ver o que está acontecendo)
    console.log(`📥 ${req.method} ${req.url} (original: ${req.originalUrl || req.url})`);
    
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
      req.originalUrl = '/api' + (req.originalUrl && req.originalUrl.startsWith('/') ? req.originalUrl : '/' + (req.originalUrl || req.url));
      console.log(`🔧 Path corrigido: ${path} → ${req.url}`);
    }
    
    // Chamar o app Express (que já é um handler válido)
    return app(req, res);
  } catch (error) {
    console.error('❌ Erro no handler:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }
};

