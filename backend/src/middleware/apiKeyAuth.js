const EmpresaApiKeyService = require('../services/empresaApiKeyService');

/**
 * Middleware de autenticação por API Key para integrações (ex: n8n).
 *
 * Aceita:
 *   - Header:  x-api-key: <chave>
 *   - Header:  Authorization: Bearer <chave>
 *
 * Delega a validação para EmpresaApiKeyService.findEmpresaByApiKey,
 * que extrai o empresa_id do formato CLOUDDAGENDA_<id>_<hash> e faz
 * bcrypt.compare apenas contra o registro correto.
 */
async function verifyIntegrationApiKey(req, res, next) {
  try {
    const headerKey = req.headers['x-api-key'];
    const authHeader = req.headers.authorization;
    const bearerKey = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    const provided = (headerKey || bearerKey || '').trim();

    if (!provided) {
      return res.status(401).json({
        success: false,
        error: 'Não autorizado',
        message: 'API Key não fornecida',
      });
    }

    const empresa = await EmpresaApiKeyService.findEmpresaByApiKey(provided);

    if (!empresa) {
      return res.status(401).json({
        success: false,
        error: 'Não autorizado',
        message: 'API Key inválida',
      });
    }

    req.empresa = { id: empresa.id, name: empresa.name };
    next();
  } catch (error) {
    console.error('[apiKeyAuth] Erro ao verificar API Key:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Erro ao verificar API Key',
    });
  }
}

module.exports = { verifyIntegrationApiKey };
