// api/index.js - Entry point para Vercel Serverless Functions
// Este arquivo exporta o app Express para funcionar no Vercel

const app = require('../backend/server');

// Exportar o handler para Vercel (serverless function)
module.exports = (req, res) => {
  return app(req, res);
};

