// Rota simples para testar se as funções serverless estão no ar.
// GET /api/health → { "status": "ok" }
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ status: 'ok', service: 'cloudd-agenda-backend', timestamp: new Date().toISOString() });
};
