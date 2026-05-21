const { onRequest } = require('firebase-functions/v2/https');
const app = require('./app');

// Exporta o Express app como Firebase Function HTTP v2
// Firebase injeta as variáveis de ambiente automaticamente (sem dotenv)
exports.api = onRequest(
  {
    region: 'southamerica-east1',
    timeoutSeconds: 60,
    memory: '256MiB',
    concurrency: 80,
    minInstances: 0
  },
  app
);
