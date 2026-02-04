const { Integration } = require('../models');
const axios = require('axios');

/**
 * Controller de Integrações (n8n)
 */
class IntegrationController {

  /**
   * Obter configuração de integração
   */
  static async getIntegration(req, res) {
    try {
      let integration = await Integration.findOne({ where: { name: 'n8n' } });

      if (!integration) {
        // Criar configuração padrão se não existir
        integration = await Integration.create({
          name: 'n8n',
          webhookUrl: null,
          apiKey: null,
          isActive: false,
        });
      }

      res.json({
        success: true,
        integration: {
          id: integration.id,
          name: integration.name,
          webhookUrl: integration.webhookUrl,
          isActive: integration.isActive,
          // Não retornar apiKey por segurança
        }
      });

    } catch (error) {
      console.error('Erro ao obter integração:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao obter configuração de integração'
      });
    }
  }

  /**
   * Atualizar configuração de integração
   */
  static async updateIntegration(req, res) {
    try {
      const { webhookUrl, isActive } = req.body;

      let integration = await Integration.findOne({ where: { name: 'n8n' } });

      if (!integration) {
        integration = await Integration.create({
          name: 'n8n',
          webhookUrl: webhookUrl || null,
          isActive: isActive !== undefined ? isActive : false,
        });
      } else {
        await integration.update({
          webhookUrl: webhookUrl || null,
          isActive: isActive !== undefined ? isActive : false,
        });
      }

      res.json({
        success: true,
        message: 'Configuração de integração atualizada com sucesso',
        integration: {
          id: integration.id,
          name: integration.name,
          webhookUrl: integration.webhookUrl,
          isActive: integration.isActive,
        }
      });

    } catch (error) {
      console.error('Erro ao atualizar integração:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao atualizar configuração de integração'
      });
    }
  }

  /**
   * Testar conexão com webhook n8n
   */
  static async testWebhook(req, res) {
    try {
      const integration = await Integration.findOne({ where: { name: 'n8n' } });

      if (!integration || !integration.webhookUrl) {
        return res.status(400).json({
          success: false,
          error: 'Webhook não configurado',
          message: 'Configure a URL do webhook antes de testar'
        });
      }

      // Enviar requisição de teste para o webhook
      const testPayload = {
        event: 'test_connection',
        timestamp: new Date().toISOString(),
        source: 'EvAgendamento',
        message: 'Teste de conexão com webhook n8n'
      };

      try {
        const response = await axios.post(integration.webhookUrl, testPayload, {
          timeout: 10000, // 10 segundos
          headers: {
            'Content-Type': 'application/json',
          }
        });

        res.json({
          success: true,
          message: 'Conexão com webhook testada com sucesso',
          status: response.status,
          statusText: response.statusText
        });

      } catch (axiosError) {
        console.error('Erro ao testar webhook:', axiosError.message);
        res.status(400).json({
          success: false,
          error: 'Falha na conexão',
          message: axiosError.response?.data?.message || axiosError.message || 'Não foi possível conectar ao webhook'
        });
      }

    } catch (error) {
      console.error('Erro ao testar webhook:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao testar conexão com webhook'
      });
    }
  }
}

module.exports = IntegrationController;













