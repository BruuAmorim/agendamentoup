const EmpresaApiKeyService = require('../services/empresaApiKeyService');

/**
 * Middleware profissional de autenticação por API Key de empresa
 * 
 * Segue padrão SaaS isolado:
 * - Lê header x-api-key
 * - Busca empresa diretamente pelo prefixo (sem loops)
 * - Adiciona req.empresa_id automaticamente
 * - Permite rotas públicas sem JWT
 * 
 * Uso:
 * router.post('/appointments', empresaApiKeyMiddleware, controller.create);
 */
async function empresaApiKeyMiddleware(req, res, next) {
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

    // Verificar formato da chave (AEVUM_<empresaId>_<randomString>)
    if (!apiKey.startsWith('AEVUM_')) {
      return res.status(401).json({
        success: false,
        error: 'API Key inválida',
        message: 'Formato de API Key inválido'
      });
    }

    // Buscar empresa pela API Key (busca direta otimizada)
    const empresa = await EmpresaApiKeyService.findEmpresaByApiKey(apiKey);

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

    console.log(`✅ [empresaApiKeyMiddleware] Empresa autenticada: ID ${empresa.id} - ${empresa.name}`);

    next();
  } catch (error) {
    console.error('❌ [empresaApiKeyMiddleware] Erro ao verificar API Key:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Erro ao verificar API Key'
    });
  }
}

module.exports = empresaApiKeyMiddleware;

