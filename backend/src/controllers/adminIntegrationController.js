const { User } = require('../models');
const ApiKeyService = require('../services/apiKeyService');

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
      // DEBUG: Log do usuário
      console.log('🔍 [getIntegrations] req.user:', JSON.stringify(req.user, null, 2));
      
      // CRÍTICO: Usar req.user.id para identificar a empresa (Admin Master usa seu próprio ID)
      const empresa_id = req.user.id;
      
      if (!empresa_id) {
        console.error('❌ [getIntegrations] empresa_id não encontrado no token');
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Usuário não identificado no token'
        });
      }

      console.log('🔍 [getIntegrations] Buscando empresa ID:', empresa_id);

      // Buscar empresa no banco - usar try/catch para campos que podem não existir
      let empresa;
      try {
        empresa = await User.findByPk(empresa_id);
      } catch (dbError) {
        console.error('❌ [getIntegrations] Erro ao buscar empresa no banco:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Erro ao buscar empresa',
          message: dbError.message
        });
      }

      if (!empresa) {
        console.error('❌ [getIntegrations] Empresa não encontrada:', empresa_id);
        return res.status(404).json({
          success: false,
          error: 'Empresa não encontrada',
          message: 'Empresa associada ao token não existe'
        });
      }

      console.log('✅ [getIntegrations] Empresa encontrada:', {
        id: empresa.id,
        name: empresa.name,
        has_api_key_hash: !!empresa.api_key_hash
      });

      // Obter URL base da API do ambiente
      const apiBaseUrl = process.env.API_BASE_URL || 
                        process.env.NGROK_URL || 
                        `http://localhost:${process.env.PORT || 3000}/api`;

      // Mascarar API Key se existir - tratamento seguro
      let api_key_masked = null;
      try {
        if (empresa.api_key_hash) {
          api_key_masked = ApiKeyService.maskApiKey(empresa.api_key_hash);
          console.log('✅ [getIntegrations] API Key mascarada gerada');
        } else {
          console.log('ℹ️ [getIntegrations] Empresa não possui API Key configurada');
        }
      } catch (maskError) {
        console.warn('⚠️ [getIntegrations] Erro ao mascarar API Key:', maskError);
        api_key_masked = null; // Retornar null se houver erro
      }

      // Preparar resposta - garantir que campos opcionais não quebrem
      const responseData = {
        api_base_url: apiBaseUrl,
        api_key_masked: api_key_masked,
        api_key_created_at: empresa.api_key_created_at || null,
        api_key_last_regenerated: empresa.api_key_last_regenerated || null
      };

      console.log('✅ [getIntegrations] Retornando dados:', {
        api_base_url: responseData.api_base_url,
        has_api_key: !!api_key_masked,
        created_at: responseData.api_key_created_at
      });

      res.json({
        success: true,
        data: responseData
      });

    } catch (error) {
      console.error('❌ [getIntegrations] Erro geral:', error);
      console.error('❌ [getIntegrations] Stack:', error.stack);
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
      // DEBUG: Log do usuário
      console.log('🔍 [generateApiKey] req.user:', JSON.stringify(req.user, null, 2));
      
      // CRÍTICO: Usar req.user.id para identificar a empresa (Admin Master usa seu próprio ID)
      const empresa_id = req.user.id;
      
      if (!empresa_id) {
        console.error('❌ [generateApiKey] empresa_id não encontrado no token');
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Usuário não identificado no token'
        });
      }

      console.log('🔍 [generateApiKey] Gerando API Key para empresa ID:', empresa_id);

      // Buscar empresa no banco
      let empresa;
      try {
        empresa = await User.findByPk(empresa_id);
      } catch (dbError) {
        console.error('❌ [generateApiKey] Erro ao buscar empresa no banco:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Erro ao buscar empresa',
          message: dbError.message
        });
      }

      if (!empresa) {
        console.error('❌ [generateApiKey] Empresa não encontrada:', empresa_id);
        return res.status(404).json({
          success: false,
          error: 'Empresa não encontrada',
          message: 'Empresa associada ao token não existe'
        });
      }

      console.log('✅ [generateApiKey] Empresa encontrada:', {
        id: empresa.id,
        name: empresa.name
      });

      // Usar ApiKeyService para regenerar API Key (32 bytes = 64 caracteres hex)
      const apiKey = await ApiKeyService.regenerateApiKey(empresa_id);
      
      console.log(`✅ [generateApiKey] API Key regenerada para empresa ID: ${empresa_id}`);

      // Obter URL base da API
      const apiBaseUrl = process.env.API_BASE_URL || 
                        process.env.NGROK_URL || 
                        `http://localhost:${process.env.PORT || 3000}/api`;

      // Buscar empresa atualizada para obter datas
      const empresaAtualizada = await User.findByPk(empresa_id, {
        attributes: ['api_key_created_at', 'api_key_last_regenerated']
      });

      // Retornar API Key apenas uma vez (nunca mais será exibida)
      res.json({
        success: true,
        message: 'API Key regenerada com sucesso',
        apiKey: apiKey, // Formato conforme especificado
        data: {
          api_key: apiKey, // Compatibilidade
          api_base_url: apiBaseUrl,
          created_at: empresaAtualizada?.api_key_created_at || null,
          last_regenerated_at: empresaAtualizada?.api_key_last_regenerated || null,
          warning: '⚠️ IMPORTANTE: Guarde esta chave com segurança. Ela não será exibida novamente.'
        }
      });

    } catch (error) {
      console.error('Erro ao gerar API Key:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Erro ao gerar API Key'
      });
    }
  }

}

module.exports = AdminIntegrationController;

