// Handler compartilhado para Vercel Serverless Functions.
// Suporta /api e /api/* sem depender de rewrite.

process.env.VERCEL = '1';

// Carregar pg e pg-hstore antes do server para o Vercel incluir na bundle (Sequelize usa dinamicamente).
try { require('pg'); require('pg-hstore'); } catch (_) {}

let app;
let appLoadError = null;

try {
  app = require('../backend/app');
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

// CORS: permitir origens da rede local e produção (usado no Vercel)
function isOriginAllowed(origin) {
  if (!origin) return true;
  const allowed = [
    /^http:\/\/localhost(:\d+)?$/,
    /^http:\/\/127\.0\.0\.1(:\d+)?$/,
    /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
    /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
    /^http:\/\/172\.\d+\.\d+\.\d+(:\d+)?$/,
    /^https:\/\/.*\.(vercel\.app|web\.app|firebaseapp\.com|ngrok\.io|ngrok-free\.app|ngrok\.app)$/
  ];
  return allowed.some(p => p.test(origin));
}

function setCorsHeaders(req, res) {
  const origin = req.headers && req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

module.exports = (req, res) => {
  setCorsHeaders(req, res);

  // Preflight: responder logo e não chamar o app
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

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
