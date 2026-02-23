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
    // Ler API Key do header (verificar múltiplas variações)
    let apiKey = req.headers['x-api-key'] || 
                 req.headers['X-API-Key'] || 
                 req.headers['X-Api-Key'] ||
                 req.headers['x-api-key:']; // Caso tenha dois pontos no final
    
    // Limpar espaços em branco e caracteres especiais no início/fim
    if (apiKey) {
      apiKey = apiKey.trim();
      // Remover dois pontos no final se houver (erro comum ao copiar/colar)
      if (apiKey.endsWith(':')) {
        apiKey = apiKey.slice(0, -1).trim();
      }
    }

    console.log(`🔍 [empresaApiKeyMiddleware] Verificando API Key...`, {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 20) + '...' : null,
      headersReceived: Object.keys(req.headers).filter(h => h.toLowerCase().includes('api'))
    });

    if (!apiKey || apiKey.length === 0) {
      console.log('❌ [empresaApiKeyMiddleware] API Key não fornecida');
      return res.status(401).json({
        success: false,
        error: 'Não autorizado',
        message: 'API Key não fornecida. Envie no header: x-api-key (sem dois pontos no final)',
        hint: 'Verifique se o header está configurado como "x-api-key" (sem dois pontos)'
      });
    }

    // Verificar formato da chave (AEVUM_<empresaId>_<randomString>)
    if (!apiKey.startsWith('AEVUM_')) {
      console.log('❌ [empresaApiKeyMiddleware] Formato de API Key inválido:', apiKey.substring(0, 20));
      return res.status(401).json({
        success: false,
        error: 'API Key inválida',
        message: 'Formato de API Key inválido. Deve começar com "AEVUM_"',
        receivedPrefix: apiKey.substring(0, 10)
      });
    }

    // Buscar empresa pela API Key (busca direta otimizada)
    console.log(`🔍 [empresaApiKeyMiddleware] Buscando empresa pela API Key...`);
    const empresa = await EmpresaApiKeyService.findEmpresaByApiKey(apiKey);

    if (!empresa) {
      console.log('❌ [empresaApiKeyMiddleware] Empresa não encontrada para a API Key fornecida');
      return res.status(401).json({
        success: false,
        error: 'Não autorizado',
        message: 'API Key inválida ou não encontrada',
        hint: 'Verifique se a API Key está correta e se foi gerada recentemente'
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


