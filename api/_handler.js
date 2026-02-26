// Handler compartilhado para Vercel Serverless Functions.
// Suporta /api e /api/* sem depender de rewrite.

process.env.VERCEL = '1';

// Carregar pg e pg-hstore antes do server para o Vercel incluir na bundle (Sequelize usa dinamicamente).
try { require('pg'); require('pg-hstore'); } catch (_) {}

let app;
let appLoadError = null;

try {
  app = require('../backend/server');
} catch (error) {
  appLoadError = error;
}

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
  if (!app || appLoadError) {
    return res.status(500).json({
      error: 'Erro ao inicializar aplicação',
      message: appLoadError ? appLoadError.message : 'App indisponível'
    });
  }

  try {
    const path = getPathFromReq(req);
    let targetPath = path;

    if (path !== '/' && !path.startsWith('/api')) {
      targetPath = `/api${path}`;
    }

    req.url = targetPath;
    req.originalUrl = req.originalUrl || targetPath;
    return app(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }
};
