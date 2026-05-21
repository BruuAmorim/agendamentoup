const EmpresaApiKeyService = require('../services/empresaApiKeyService');
const { User } = require('../models');

/**
 * Controller para gerenciamento de API Keys de empresas
 * Apenas empresas podem gerar/regenerar suas próprias chaves
 */
class EmpresaApiKeyController {

  /**
   * POST /api/empresa/api-key/regenerate
   * Regenera API Key da empresa logada
   * Apenas empresa_admin (role: empresa ou moderator) pode acessar
   */
  static async regenerateApiKey(req, res) {
    try {
      // Verificar autenticação
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Não autorizado',
          message: 'É necessário estar autenticado'
        });
      }

      const userId = req.user.id;
      const userRole = req.user.role;

      if (userRole === 'admin_master') {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Admin Master não pode gerar API Keys para empresas'
        });
      }

      if (userRole !== 'empresa' && userRole !== 'moderator') {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Apenas empresas podem gerar API Keys'
        });
      }

      // Moderadores são a própria empresa — empresa_id = id
      const empresaId = userId;

      // Regenerar API Key
      const result = await EmpresaApiKeyService.regenerateApiKey(empresaId);

      console.log(`✅ [EmpresaApiKeyController] API Key regenerada para empresa ID: ${empresaId}`);

      // Retornar API Key apenas uma vez (nunca mais será exibida)
      res.json({
        success: true,
        message: 'API Key regenerada com sucesso',
        apiKey: result.apiKey, // Formato: AEVUM_<empresaId>_<randomString>
        prefix: result.prefix,
        warning: '⚠️ IMPORTANTE: Guarde esta chave com segurança. Ela não será exibida novamente.'
      });

    } catch (error) {
      console.error('❌ [EmpresaApiKeyController] Erro ao regenerar API Key:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message || 'Erro ao regenerar API Key'
      });
    }
  }

  /**
   * GET /api/empresa/api-key/info
   * Retorna informações da API Key da empresa logada (sem expor a chave)
   */
  static async getApiKeyInfo(req, res) {
    try {
      // Verificar autenticação
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Não autorizado',
          message: 'É necessário estar autenticado'
        });
      }

      const userRole = req.user.role;

      if (userRole !== 'empresa' && userRole !== 'moderator') {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Apenas empresas podem visualizar informações da API Key'
        });
      }

      // Moderadores são a própria empresa
      const empresaId = req.user.id;

      // Obter informações
      const info = await EmpresaApiKeyService.getApiKeyInfo(empresaId);

      // Garantir que hasApiKey seja boolean explícito
      const hasApiKey = Boolean(info.hasApiKey);

      console.log('🔍 [EmpresaApiKeyController] Info da API Key:', {
        empresaId,
        hasApiKey,
        prefix: info.prefix,
        createdAt: info.createdAt,
        lastRegenerated: info.lastRegenerated
      });

      const responseData = {
        success: true,
        data: {
          hasApiKey: hasApiKey, // Garantir boolean explícito
          prefix: info.prefix || null, // Ex: AEVUM_5
          createdAt: info.createdAt,
          lastRegenerated: info.lastRegenerated
        }
      };

      console.log('✅ [EmpresaApiKeyController] Enviando resposta:', responseData);

      res.json(responseData);

    } catch (error) {
      console.error('❌ [EmpresaApiKeyController] Erro ao obter informações da API Key:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message || 'Erro ao obter informações da API Key'
      });
    }
  }
}

module.exports = EmpresaApiKeyController;

