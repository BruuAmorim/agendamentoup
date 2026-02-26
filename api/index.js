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
// O Vercel pode passar req.url como path (/api/health) ou URL completa; normalizamos para path.
function getPathFromReq(req) {
  let path = req.url || '/';
  if (path.startsWith('http')) {
    try {
      path = new URL(path).pathname || '/';
    } catch (_) {
      path = '/';
    }
  }
  return path.startsWith('/') ? path : '/' + path;
}

module.exports = (req, res) => {
  const path = getPathFromReq(req);
  console.log(`📥 [${new Date().toISOString()}] ${req.method} ${path}`);
  
  if (!app) {
    console.error('❌ App não está disponível!');
    return res.status(500).json({
      error: 'Aplicação não inicializada'
    });
  }
  
  try {
    // Express espera rotas sob /api (ex: /api/health, /api/auth/login)
    let targetPath = path;
    if (path === '/' || path === '') {
      targetPath = '/';
    } else if (!path.startsWith('/api')) {
      targetPath = '/api' + (path === '/' ? '' : path);
    }
    req.url = targetPath;
    req.originalUrl = req.originalUrl || targetPath;
    
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

