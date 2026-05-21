const { User } = require('../models');
const ApiKeyService = require('../services/apiKeyService');
const EmpresaApiKeyService = require('../services/empresaApiKeyService');

/**
 * Controller para gerenciamento de integrações por empresa (Admin Master)
 */
class AdminIntegrationController {

  /**
   * GET /api/admin/integrations
   * Retorna informações de integração da empresa logada
   */
  static async getIntegrations(req, res) {
    try {
      const empresa_id = req.user.id;
      if (!empresa_id) {
        return res.status(403).json({ success: false, error: 'Acesso negado', message: 'Usuário não identificado no token' });
      }

      const empresa = await User.findByPk(empresa_id);
      if (!empresa) {
        return res.status(404).json({ success: false, error: 'Empresa não encontrada', message: 'Empresa associada ao token não existe' });
      }

      const apiBaseUrl = process.env.API_BASE_URL || process.env.NGROK_URL || `http://localhost:${process.env.PORT || 3000}/api`;

      let api_key_masked = null;
      try {
        if (empresa.api_key_hash) api_key_masked = ApiKeyService.maskApiKey(empresa.api_key_hash);
      } catch (_) { /* manter null se falhar */ }

      res.json({
        success: true,
        data: {
          api_base_url: apiBaseUrl,
          api_key_masked,
          api_key_created_at: empresa.api_key_created_at || null,
          api_key_last_regenerated: empresa.api_key_last_regenerated || null
        }
      });

    } catch (error) {
      console.error('Erro ao obter integrações:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message || 'Erro ao obter informações de integração',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * POST /api/admin/generate-api-key
   * Gera nova API Key para a empresa logada
   */
  static async generateApiKey(req, res) {
    try {
      const empresa_id = req.user.id;
      if (!empresa_id) {
        return res.status(403).json({ success: false, error: 'Acesso negado', message: 'Usuário não identificado no token' });
      }

      const empresa = await User.findByPk(empresa_id);
      if (!empresa) {
        return res.status(404).json({ success: false, error: 'Empresa não encontrada', message: 'Empresa associada ao token não existe' });
      }

      const apiKey = await ApiKeyService.regenerateApiKey(empresa_id);
      const apiBaseUrl = process.env.API_BASE_URL || process.env.NGROK_URL || `http://localhost:${process.env.PORT || 3000}/api`;

      const empresaAtualizada = await User.findByPk(empresa_id, {
        attributes: ['api_key_created_at', 'api_key_last_regenerated']
      });

      res.json({
        success: true,
        message: 'API Key regenerada com sucesso',
        apiKey,
        data: {
          api_key: apiKey,
          api_base_url: apiBaseUrl,
          created_at: empresaAtualizada?.api_key_created_at || null,
          last_regenerated_at: empresaAtualizada?.api_key_last_regenerated || null,
          warning: '⚠️ IMPORTANTE: Guarde esta chave com segurança. Ela não será exibida novamente.'
        }
      });

    } catch (error) {
      console.error('Erro ao gerar API Key:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor', message: 'Erro ao gerar API Key' });
    }
  }

  /**
   * POST /api/admin/integrations/company-api-key
   * Admin master: gera/regenera API Key para uma empresa específica (por ID)
   * Usa o padrão AEVUM_<empresaId>_<random> do EmpresaApiKeyService.
   */
  static async generateCompanyApiKey(req, res) {
    try {
      const { companyId } = req.body || {};

      if (!companyId) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'companyId é obrigatório no corpo da requisição'
        });
      }

      const empresaId = parseInt(companyId, 10);
      if (!Number.isFinite(empresaId)) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'companyId deve ser um número válido'
        });
      }

      // Buscar empresa e validar role
      const empresa = await User.findByPk(empresaId);
      if (!empresa) {
        return res.status(404).json({
          success: false,
          error: 'Empresa não encontrada',
          message: `Nenhuma empresa encontrada com ID ${empresaId}`
        });
      }

      if (empresa.role !== 'moderator') {
        return res.status(400).json({
          success: false,
          error: 'Usuário não é empresa',
          message: `Usuário com ID ${empresaId} não é uma empresa (role atual: ${empresa.role})`
        });
      }

      // Gerar/regenerar API Key usando o serviço multi-tenant
      const result = await EmpresaApiKeyService.regenerateApiKey(empresaId);

      // URL base da API (a mesma exibida na página)
      const apiBaseUrl = process.env.API_BASE_URL ||
        process.env.NGROK_URL ||
        `http://localhost:${process.env.PORT || 3000}/api`;

      return res.json({
        success: true,
        message: 'API Key da empresa regenerada com sucesso',
        apiKey: result.apiKey, // ATENÇÃO: exibida apenas nesta resposta
        data: {
          api_key: result.apiKey,
          api_base_url: apiBaseUrl,
          prefix: result.prefix,
          warning: '⚠️ IMPORTANTE: copie e guarde esta chave. Ela não será exibida novamente.'
        }
      });
    } catch (error) {
      console.error('❌ [generateCompanyApiKey] Erro ao gerar API Key para empresa:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message || 'Erro ao gerar API Key para a empresa'
      });
    }
  }

}

module.exports = AdminIntegrationController;

