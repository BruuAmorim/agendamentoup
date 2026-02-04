const { Integration } = require('../models');
const axios = require('axios');

/**
 * Serviço para disparar eventos para webhooks (n8n)
 */
class WebhookService {

  /**
   * Disparar evento para webhook n8n
   */
  static async triggerWebhook(event, data) {
    try {
      const integration = await Integration.findOne({ 
        where: { name: 'n8n', isActive: true } 
      });

      if (!integration || !integration.webhookUrl) {
        // Webhook não configurado ou inativo - não é erro, apenas não dispara
        return { success: false, message: 'Webhook não configurado ou inativo' };
      }

      const payload = {
        event: event,
        timestamp: new Date().toISOString(),
        source: 'EvAgendamento',
        data: data
      };

      // Disparar webhook de forma assíncrona (não bloquear a resposta)
      axios.post(integration.webhookUrl, payload, {
        timeout: 5000, // 5 segundos
        headers: {
          'Content-Type': 'application/json',
        }
      }).then(() => {
        console.log(`✅ Webhook disparado com sucesso: ${event}`);
      }).catch((error) => {
        console.error(`❌ Erro ao disparar webhook (${event}):`, error.message);
        // Não lançar erro - falha no webhook não deve quebrar o fluxo principal
      });

      return { success: true, message: 'Webhook disparado' };

    } catch (error) {
      console.error('Erro ao disparar webhook:', error);
      // Não lançar erro - falha no webhook não deve quebrar o fluxo principal
      return { success: false, message: error.message };
    }
  }

  /**
   * Disparar evento de criação de agendamento
   */
  static async onAppointmentCreated(appointment) {
    return this.triggerWebhook('appointment_created', {
      appointment: appointment.toJSON ? appointment.toJSON() : appointment
    });
  }

  /**
   * Disparar evento de atualização de agendamento
   */
  static async onAppointmentUpdated(appointment) {
    return this.triggerWebhook('appointment_updated', {
      appointment: appointment.toJSON ? appointment.toJSON() : appointment
    });
  }

  /**
   * Disparar evento de exclusão de agendamento
   */
  static async onAppointmentDeleted(appointmentId) {
    return this.triggerWebhook('appointment_deleted', {
      appointmentId: appointmentId
    });
  }

  /**
   * Disparar evento de cancelamento de agendamento
   */
  static async onAppointmentCancelled(appointment) {
    return this.triggerWebhook('appointment_cancelled', {
      appointment: appointment.toJSON ? appointment.toJSON() : appointment
    });
  }
}

module.exports = WebhookService;













