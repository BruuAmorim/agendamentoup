// Entry point para Vercel: exporta o app Express (backend/server.js).
// A Vercel detecta index.js na raiz e trata como Serverless Function única.
process.env.VERCEL = '1';
module.exports = require('./backend/server');
