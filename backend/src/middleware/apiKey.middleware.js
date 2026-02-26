const ApiKeyService = require('../services/apiKeyService');

/**
 * Middleware profissional de autenticação por API Key
 * 
 * Segue padrão SaaS seguro:
 * - Lê header x-api-key
 * - Busca empresa pelo hash da chave
 * - Adiciona req.empresa_id automaticamente
 * - Permite rotas públicas sem JWT
 * 
 * Uso:
 * router.post('/appointments', apiKeyMiddleware, controller.create);
 */
async function apiKeyMiddleware(req, res, next) {
  try {
    // Ler API Key do header
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Não autorizado',
        message: 'API Key não fornecida. Envie no header: x-api-key'
      });
    }

    // Buscar empresa pela API Key
    const empresa = await ApiKeyService.findEmpresaByApiKey(apiKey);

    if (!empresa) {
      return res.status(401).json({
        success: false,
        error: 'Não autorizado',
        message: 'API Key inválida ou não encontrada'
      });
    }

    // Adicionar empresa_id ao request para isolamento multi-tenant
    req.empresa_id = empresa.id;
    req.empresa = {
      id: empresa.id,
      name: empresa.name,
      email: empresa.email,
      role: empresa.role
    };

    console.log(`✅ [apiKeyMiddleware] Empresa autenticada: ID ${empresa.id} - ${empresa.name}`);

    next();
  } catch (error) {
    console.error('❌ [apiKeyMiddleware] Erro ao verificar API Key:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Erro ao verificar API Key'
    });
  }
}

module.exports = apiKeyMiddleware;







