/**
 * Middleware de autenticação para integrações (ex: n8n)
 *
 * Aceita:
 * - Header: x-api-key: <chave>
 * - OU Authorization: Bearer <chave>
 *
 * Configure a chave em: process.env.N8N_API_KEY
 */
function verifyIntegrationApiKey(req, res, next) {
  const expected = process.env.N8N_API_KEY;

  if (!expected) {
    return res.status(500).json({
      success: false,
      error: 'Integração não configurada',
      message: 'N8N_API_KEY não configurada no servidor'
    });
  }

  const headerKey = req.headers['x-api-key'];
  const authHeader = req.headers.authorization;
  const bearerKey = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  const provided = headerKey || bearerKey;

  if (!provided || provided !== expected) {
    return res.status(401).json({
      success: false,
      error: 'Não autorizado',
      message: 'API Key inválida ou ausente'
    });
  }

  next();
}

module.exports = {
  verifyIntegrationApiKey
};














